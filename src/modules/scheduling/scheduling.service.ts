import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DateTime } from 'luxon';
import {
  Appointment,
  TherapistBlockedTime,
  TherapistProfile,
  TherapistSchedule,
  TherapyProduct,
} from '@/database/models';
import { AuditService } from '../audit/audit.service';
import {
  AvailabilityQueryDto,
  CreateBlockedTimeDto,
  CreateScheduleDto,
  UpdateBlockedTimeDto,
  UpdateScheduleDto,
} from './dto/scheduling.dto';

const ACTIVE_APPOINTMENT_STATUSES = ['REQUESTED', 'CONFIRMED'];

@Injectable()
export class SchedulingService {
  constructor(
    @InjectModel(TherapistSchedule) private readonly scheduleModel: typeof TherapistSchedule,
    @InjectModel(TherapistBlockedTime) private readonly blockedModel: typeof TherapistBlockedTime,
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(TherapyProduct) private readonly productModel: typeof TherapyProduct,
    @InjectModel(TherapistProfile) private readonly therapistProfileModel: typeof TherapistProfile,
    private readonly audit: AuditService,
  ) {}

  // ---------------------------------------------------------------------------
  // Horarios recurrentes
  // ---------------------------------------------------------------------------

  async createSchedule(therapistUserId: string, dto: CreateScheduleDto, actorUserId?: string) {
    this.assertTimeRange(dto.startTime, dto.endTime);
    await this.assertNoOverlap(therapistUserId, dto.weekday, dto.startTime, dto.endTime);
    return this.scheduleModel.sequelize!.transaction(async (transaction) => {
      const schedule = await this.scheduleModel.create(
        {
          therapistUserId,
          ...dto,
          status: 'ACTIVE',
          version: 1,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.create_schedule',
          entityType: 'TherapistSchedule',
          entityId: schedule.id,
          after: schedule.toJSON(),
        },
        { transaction },
      );
      return schedule;
    });
  }

  listMySchedules(therapistUserId: string) {
    return this.scheduleModel.findAll({
      where: { therapistUserId },
      order: [
        ['weekday', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });
  }

  async getSchedule(therapistUserId: string, scheduleId: string) {
    const schedule = await this.scheduleModel.findOne({
      where: { id: scheduleId, therapistUserId },
    });
    if (!schedule)
      throw new NotFoundException({
        code: 'SCHEDULE_NOT_FOUND',
        message: 'Horario no encontrado.',
      });
    return schedule;
  }

  /**
   * Corrige un horario ya registrado. Es la operación que faltaba: hasta ahora un
   * horario mal cargado solo se podía dejar ahí o duplicar, porque no había ni PATCH
   * ni DELETE. Se revalida el solapamiento excluyendo el propio registro; si no, un
   * horario siempre chocaría consigo mismo.
   */
  async updateSchedule(
    therapistUserId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
    actorUserId?: string,
  ) {
    const schedule = await this.getSchedule(therapistUserId, scheduleId);
    const before = schedule.toJSON();

    const weekday = dto.weekday ?? schedule.weekday;
    const startTime = dto.startTime ?? schedule.startTime;
    const endTime = dto.endTime ?? schedule.endTime;
    const status = dto.status ?? schedule.status;

    this.assertTimeRange(startTime, endTime);
    if (status === 'ACTIVE') {
      await this.assertNoOverlap(therapistUserId, weekday, startTime, endTime, scheduleId);
    }
    if (dto.effectiveTo && dto.effectiveTo < (dto.effectiveFrom ?? schedule.effectiveFrom)) {
      throw new BadRequestException({
        code: 'SCHEDULE_INVALID_EFFECTIVE_RANGE',
        message: 'La fecha "vigente hasta" no puede ser anterior a "vigente desde".',
      });
    }

    return this.scheduleModel.sequelize!.transaction(async (transaction) => {
      await schedule.update(
        {
          ...dto,
          weekday,
          startTime,
          endTime,
          status,
          version: schedule.version + 1,
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.update_schedule',
          entityType: 'TherapistSchedule',
          entityId: schedule.id,
          before,
          after: schedule.toJSON(),
        },
        { transaction },
      );
      return schedule;
    });
  }

  /**
   * Borrado lógico (el modelo es `paranoid`): el horario desaparece de la agenda y
   * de la disponibilidad pública, pero la fila sigue en la base para auditoría.
   */
  async deleteSchedule(therapistUserId: string, scheduleId: string, actorUserId?: string) {
    const schedule = await this.getSchedule(therapistUserId, scheduleId);
    const before = schedule.toJSON();
    await this.scheduleModel.sequelize!.transaction(async (transaction) => {
      await schedule.update({ status: 'INACTIVE' } as any, { transaction });
      await schedule.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.delete_schedule',
          entityType: 'TherapistSchedule',
          entityId: scheduleId,
          before,
        },
        { transaction },
      );
    });
    return { success: true, id: scheduleId };
  }

  // ---------------------------------------------------------------------------
  // Bloqueos de agenda
  // ---------------------------------------------------------------------------

  async createBlockedTime(
    therapistUserId: string,
    dto: CreateBlockedTimeDto,
    actorUserId?: string,
  ) {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt)
      throw new BadRequestException({
        code: 'BLOCK_INVALID_RANGE',
        message: 'endAt debe ser mayor a startAt.',
      });
    return this.blockedModel.sequelize!.transaction(async (transaction) => {
      const blocked = await this.blockedModel.create(
        {
          therapistUserId,
          startAt,
          endAt,
          reason: dto.reason,
          status: 'ACTIVE',
        } as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.create_block',
          entityType: 'TherapistBlockedTime',
          entityId: blocked.id,
          after: blocked.toJSON(),
        },
        { transaction },
      );
      return blocked;
    });
  }

  listBlockedTimes(therapistUserId: string) {
    return this.blockedModel.findAll({
      where: { therapistUserId },
      order: [['startAt', 'DESC']],
    });
  }

  async getBlockedTime(therapistUserId: string, blockedTimeId: string) {
    const blocked = await this.blockedModel.findOne({
      where: { id: blockedTimeId, therapistUserId },
    });
    if (!blocked)
      throw new NotFoundException({
        code: 'BLOCK_NOT_FOUND',
        message: 'Bloqueo no encontrado.',
      });
    return blocked;
  }

  async updateBlockedTime(
    therapistUserId: string,
    blockedTimeId: string,
    dto: UpdateBlockedTimeDto,
    actorUserId?: string,
  ) {
    const blocked = await this.getBlockedTime(therapistUserId, blockedTimeId);
    const before = blocked.toJSON();
    const startAt = dto.startAt ? new Date(dto.startAt) : blocked.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : blocked.endAt;
    if (endAt <= startAt)
      throw new BadRequestException({
        code: 'BLOCK_INVALID_RANGE',
        message: 'endAt debe ser mayor a startAt.',
      });

    return this.blockedModel.sequelize!.transaction(async (transaction) => {
      await blocked.update({ ...dto, startAt, endAt } as any, { transaction });
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.update_block',
          entityType: 'TherapistBlockedTime',
          entityId: blocked.id,
          before,
          after: blocked.toJSON(),
        },
        { transaction },
      );
      return blocked;
    });
  }

  async deleteBlockedTime(therapistUserId: string, blockedTimeId: string, actorUserId?: string) {
    const blocked = await this.getBlockedTime(therapistUserId, blockedTimeId);
    const before = blocked.toJSON();
    await this.blockedModel.sequelize!.transaction(async (transaction) => {
      await blocked.update({ status: 'INACTIVE' } as any, { transaction });
      await blocked.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId: actorUserId ?? therapistUserId,
          action: 'scheduling.delete_block',
          entityType: 'TherapistBlockedTime',
          entityId: blockedTimeId,
          before,
        },
        { transaction },
      );
    });
    return { success: true, id: blockedTimeId };
  }

  /**
   * Las rutas administrativas reciben el terapeuta por la URL. Verificamos que ese
   * usuario tenga perfil de terapeuta para no crear horarios colgando de un id que
   * en realidad es un paciente o un administrador.
   */
  async assertTherapistExists(therapistUserId: string) {
    const profile = await this.therapistProfileModel.findByPk(therapistUserId);
    if (!profile)
      throw new NotFoundException({
        code: 'THERAPIST_PROFILE_NOT_FOUND',
        message: 'El usuario indicado no tiene perfil de terapeuta.',
      });
    return profile;
  }

  // ---------------------------------------------------------------------------
  // Disponibilidad pública
  // ---------------------------------------------------------------------------

  async getAvailability(query: AvailabilityQueryDto) {
    const product = await this.productModel.findByPk(query.productId);
    if (!product)
      throw new NotFoundException({
        code: 'THERAPY_PRODUCT_NOT_FOUND',
        message: 'Producto no encontrado.',
      });
    const from = DateTime.fromISO(query.from, { zone: query.timezone }).startOf('day');
    const to = DateTime.fromISO(query.to, { zone: query.timezone }).endOf('day');
    if (!from.isValid || !to.isValid || to < from)
      throw new BadRequestException({
        code: 'AVAILABILITY_INVALID_RANGE',
        message: 'Rango de fechas inválido.',
      });
    if (to.diff(from, 'days').days > 31)
      throw new BadRequestException({
        code: 'AVAILABILITY_RANGE_TOO_LONG',
        message: 'El rango máximo es de 31 días.',
      });

    const schedules = await this.scheduleModel.findAll({
      where: { therapistUserId: query.therapistUserId, status: 'ACTIVE' },
    });
    const startUtc = from.toUTC().toJSDate();
    const endUtc = to.toUTC().toJSDate();
    const blocks = await this.blockedModel.findAll({
      where: {
        therapistUserId: query.therapistUserId,
        status: 'ACTIVE',
        startAt: { [Op.lt]: endUtc },
        endAt: { [Op.gt]: startUtc },
      },
    });
    const appointments = await this.appointmentModel.findAll({
      where: {
        therapistUserId: query.therapistUserId,
        status: ACTIVE_APPOINTMENT_STATUSES,
        scheduledStartAt: { [Op.lt]: endUtc },
        scheduledEndAt: { [Op.gt]: startUtc },
      } as any,
    });

    const duration = product.durationMinutes;
    const slots: { startAt: string; endAt: string; timezone: string }[] = [];
    for (let day = from; day <= to; day = day.plus({ days: 1 })) {
      const jsWeekday = day.weekday % 7;
      const daySchedules = schedules.filter(
        (s) =>
          s.weekday === jsWeekday &&
          day.toISODate()! >= s.effectiveFrom &&
          (!s.effectiveTo || day.toISODate()! <= s.effectiveTo),
      );
      for (const schedule of daySchedules) {
        let cursor = DateTime.fromISO(`${day.toISODate()}T${schedule.startTime}`, {
          zone: schedule.timezone,
        });
        const scheduleEnd = DateTime.fromISO(`${day.toISODate()}T${schedule.endTime}`, {
          zone: schedule.timezone,
        });
        while (cursor.plus({ minutes: duration }) <= scheduleEnd) {
          const slotStart = cursor.toUTC();
          const slotEnd = cursor.plus({ minutes: duration }).toUTC();
          if (
            !this.overlapsAny(slotStart.toJSDate(), slotEnd.toJSDate(), blocks) &&
            !this.overlapsAny(slotStart.toJSDate(), slotEnd.toJSDate(), appointments)
          ) {
            slots.push({
              startAt: slotStart.toISO()!,
              endAt: slotEnd.toISO()!,
              timezone: query.timezone,
            });
          }
          cursor = cursor.plus({ minutes: duration });
        }
      }
    }
    return { therapistUserId: query.therapistUserId, productId: query.productId, slots };
  }

  async isSlotAvailable(therapistUserId: string, startAt: Date, endAt: Date) {
    const appointment = await this.appointmentModel.findOne({
      where: {
        therapistUserId,
        status: ACTIVE_APPOINTMENT_STATUSES,
        scheduledStartAt: { [Op.lt]: endAt },
        scheduledEndAt: { [Op.gt]: startAt },
      } as any,
    });
    const block = await this.blockedModel.findOne({
      where: {
        therapistUserId,
        status: 'ACTIVE',
        startAt: { [Op.lt]: endAt },
        endAt: { [Op.gt]: startAt },
      },
    });
    return !appointment && !block;
  }

  // ---------------------------------------------------------------------------
  // Utilidades internas
  // ---------------------------------------------------------------------------

  private assertTimeRange(startTime: string, endTime: string) {
    if (endTime <= startTime)
      throw new BadRequestException({
        code: 'SCHEDULE_INVALID_RANGE',
        message: 'endTime debe ser mayor a startTime.',
      });
  }

  private async assertNoOverlap(
    therapistUserId: string,
    weekday: number,
    startTime: string,
    endTime: string,
    excludeScheduleId?: string,
  ) {
    const where: Record<string, unknown> = {
      therapistUserId,
      weekday,
      status: 'ACTIVE',
      startTime: { [Op.lt]: endTime },
      endTime: { [Op.gt]: startTime },
    };
    if (excludeScheduleId) where.id = { [Op.ne]: excludeScheduleId };

    const overlaps = await this.scheduleModel.findOne({ where: where as any });
    if (overlaps)
      throw new BadRequestException({
        code: 'SCHEDULE_OVERLAP',
        message: 'El horario se solapa con otro horario activo.',
      });
  }

  private overlapsAny(
    start: Date,
    end: Date,
    list: Array<{ startAt?: Date; endAt?: Date; scheduledStartAt?: Date; scheduledEndAt?: Date }>,
  ) {
    return list.some((item) => {
      const itemStart = item.startAt ?? item.scheduledStartAt!;
      const itemEnd = item.endAt ?? item.scheduledEndAt!;
      return itemStart < end && itemEnd > start;
    });
  }
}
