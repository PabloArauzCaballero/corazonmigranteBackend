import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DateTime } from 'luxon';
import { Appointment, AppointmentStatusHistory, TherapyProduct } from '@/database/models';
import { AuthenticatedUser } from '@/common/types/authenticated-user';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateAppointmentDto, UpdateAppointmentStatusDto } from './dto/appointment.dto';
import { canTransitionAppointment } from './policies/status-transition.policy';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(AppointmentStatusHistory)
    private readonly historyModel: typeof AppointmentStatusHistory,
    @InjectModel(TherapyProduct) private readonly productModel: typeof TherapyProduct,
    private readonly scheduling: SchedulingService,
    private readonly audit: AuditService,
    private readonly messaging: MessagingService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto) {
    const product = await this.productModel.findByPk(dto.productId);
    if (!product)
      throw new NotFoundException({
        code: 'THERAPY_PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    const startAt = DateTime.fromISO(dto.scheduledStartAt).toJSDate();
    const endAt = DateTime.fromJSDate(startAt)
      .plus({ minutes: product.durationMinutes })
      .toJSDate();
    const available = await this.scheduling.isSlotAvailable(dto.therapistUserId, startAt, endAt);
    if (!available)
      throw new BadRequestException({
        code: 'APPOINTMENT_SLOT_NOT_AVAILABLE',
        message: 'El horario seleccionado ya no está disponible.',
      });

    return this.appointmentModel.sequelize!.transaction(async (transaction) => {
      const appointment = await this.appointmentModel.create(
        {
          patientUserId: user.sub,
          therapistUserId: dto.therapistUserId,
          productId: dto.productId,
          scheduledStartAt: startAt,
          scheduledEndAt: endAt,
          timezone: dto.timezone,
          status: 'REQUESTED',
          price: Number(product.price),
          currency: product.currency,
          notesForTherapist: dto.notesForTherapist,
        } as any,
        { transaction },
      );
      await this.historyModel.create(
        {
          appointmentId: appointment.id,
          fromStatus: null,
          toStatus: 'REQUESTED',
          changedByUserId: user.sub,
          reason: 'Creación de cita',
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId: user.sub,
          action: 'appointments.create',
          entityType: 'Appointment',
          entityId: appointment.id,
          after: appointment.toJSON(),
        },
        { transaction },
      );
      await this.messaging.enqueue(
        {
          channel: 'EMAIL',
          recipient: user.email,
          templateCode: 'APPOINTMENT_REQUESTED',
          payload: { appointmentId: appointment.id },
        },
        { transaction },
      );
      return appointment;
    });
  }

  async listMine(user: AuthenticatedUser, query: PaginationQueryDto) {
    const where: any = user.roles.includes('THERAPIST')
      ? { therapistUserId: user.sub }
      : { patientUserId: user.sub };
    const { rows, count } = await this.appointmentModel.findAndCountAll({
      where,
      ...toLimitOffset(query),
      order: [['scheduledStartAt', 'DESC']],
    });
    return { items: rows, pagination: buildPagination(query, count) };
  }

  async adminList(query: PaginationQueryDto) {
    const { rows, count } = await this.appointmentModel.findAndCountAll({
      ...toLimitOffset(query),
      order: [['scheduledStartAt', 'DESC']],
    });
    return { items: rows, pagination: buildPagination(query, count) };
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateAppointmentStatusDto) {
    const appointment = await this.appointmentModel.findByPk(id);
    if (!appointment)
      throw new NotFoundException({
        code: 'APPOINTMENT_NOT_FOUND',
        message: 'Cita no encontrada.',
      });
    const ownsAsPatient = appointment.patientUserId === user.sub;
    const ownsAsTherapist = appointment.therapistUserId === user.sub;
    const isAdmin = user.roles.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r));
    if (!ownsAsPatient && !ownsAsTherapist && !isAdmin)
      throw new ForbiddenException({
        code: 'APPOINTMENT_FORBIDDEN',
        message: 'No puede modificar esta cita.',
      });
    if (!canTransitionAppointment(appointment.status, dto.status))
      throw new BadRequestException({
        code: 'APPOINTMENT_INVALID_TRANSITION',
        message: `No se puede pasar de ${appointment.status} a ${dto.status}.`,
      });
    const before = appointment.toJSON();
    return this.appointmentModel.sequelize!.transaction(async (transaction) => {
      await appointment.update({ status: dto.status } as any, { transaction });
      await this.historyModel.create(
        {
          appointmentId: appointment.id,
          fromStatus: before.status,
          toStatus: dto.status,
          changedByUserId: user.sub,
          reason: dto.reason,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId: user.sub,
          action: 'appointments.update_status',
          entityType: 'Appointment',
          entityId: id,
          before,
          after: { status: dto.status },
        },
        { transaction },
      );
      await this.messaging.enqueue(
        {
          channel: 'EMAIL',
          recipient: user.email,
          templateCode: 'APPOINTMENT_STATUS_CHANGED',
          payload: { appointmentId: appointment.id, status: dto.status },
        },
        { transaction },
      );
      return appointment;
    });
  }
}
