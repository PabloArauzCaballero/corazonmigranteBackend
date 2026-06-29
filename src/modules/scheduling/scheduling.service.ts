import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { DateTime } from 'luxon';
import {
  Appointment,
  TherapistBlockedTime,
  TherapistSchedule,
  TherapyProduct,
} from '@/database/models';
import { AuditService } from '../audit/audit.service';
import {
  AvailabilityQueryDto,
  CreateBlockedTimeDto,
  CreateScheduleDto,
} from './dto/scheduling.dto';

const ACTIVE_APPOINTMENT_STATUSES = ['REQUESTED', 'CONFIRMED'];

@Injectable()
export class SchedulingService {
  constructor(
    @InjectModel(TherapistSchedule) private readonly scheduleModel: typeof TherapistSchedule,
    @InjectModel(TherapistBlockedTime) private readonly blockedModel: typeof TherapistBlockedTime,
    @InjectModel(Appointment) private readonly appointmentModel: typeof Appointment,
    @InjectModel(TherapyProduct) private readonly productModel: typeof TherapyProduct,
    private readonly audit: AuditService,
  ) {}

  async createSchedule(therapistUserId: string, dto: CreateScheduleDto) {
    if (dto.endTime <= dto.startTime)
      throw new BadRequestException({
        code: 'SCHEDULE_INVALID_RANGE',
        message: 'endTime debe ser mayor a startTime.',
      });
    const overlaps = await this.scheduleModel.findOne({
      where: {
        therapistUserId,
        weekday: dto.weekday,
        status: 'ACTIVE',
        [Op.or]: [{ startTime: { [Op.lt]: dto.endTime }, endTime: { [Op.gt]: dto.startTime } }],
      } as any,
    });
    if (overlaps)
      throw new BadRequestException({
        code: 'SCHEDULE_OVERLAP',
        message: 'El horario se solapa con otro horario activo.',
      });
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
          actorUserId: therapistUserId,
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

  async createBlockedTime(therapistUserId: string, dto: CreateBlockedTimeDto) {
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
          actorUserId: therapistUserId,
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
