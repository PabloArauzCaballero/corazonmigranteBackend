import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AdminProfile, PatientProfile, TherapistProfile, User } from '@/database/models';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { AuditService } from '../audit/audit.service';
import { UpdatePatientProfileDto, UpdateTherapistProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(PatientProfile) private readonly patientProfileModel: typeof PatientProfile,
    @InjectModel(TherapistProfile) private readonly therapistProfileModel: typeof TherapistProfile,
    @InjectModel(AdminProfile) private readonly adminProfileModel: typeof AdminProfile,
    private readonly rolesPermissions: RolesPermissionsService,
    private readonly audit: AuditService,
  ) {}

  async me(userId: string) {
    const user = await this.userModel.findByPk(userId, {
      include: [PatientProfile, TherapistProfile, AdminProfile],
    });
    if (!user)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' });
    const auth = await this.rolesPermissions.getUserRolesAndPermissions(user.id);
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      ...auth,
      patientProfile: user.patientProfile,
      therapistProfile: user.therapistProfile,
      adminProfile: user.adminProfile,
    };
  }

  async updatePatientProfile(userId: string, dto: UpdatePatientProfileDto) {
    const profile = await this.patientProfileModel.findByPk(userId);
    if (!profile)
      throw new NotFoundException({
        code: 'PATIENT_PROFILE_NOT_FOUND',
        message: 'Perfil paciente no encontrado.',
      });
    const before = profile.toJSON();
    return this.patientProfileModel.sequelize!.transaction(async (transaction) => {
      await profile.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId: userId,
          action: 'users.update_patient_profile',
          entityType: 'PatientProfile',
          entityId: userId,
          before,
          after: dto as any,
        },
        { transaction },
      );
      return profile;
    });
  }

  async updateTherapistProfile(userId: string, dto: UpdateTherapistProfileDto) {
    const profile = await this.therapistProfileModel.findByPk(userId);
    if (!profile)
      throw new NotFoundException({
        code: 'THERAPIST_PROFILE_NOT_FOUND',
        message: 'Perfil terapeuta no encontrado.',
      });
    const before = profile.toJSON();
    return this.therapistProfileModel.sequelize!.transaction(async (transaction) => {
      await profile.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId: userId,
          action: 'users.update_therapist_profile',
          entityType: 'TherapistProfile',
          entityId: userId,
          before,
          after: dto as any,
        },
        { transaction },
      );
      return profile;
    });
  }

  async list(query: PaginationQueryDto) {
    const where = query.search ? { email: { [Op.iLike]: `%${query.search}%` } } : undefined;
    const { rows, count } = await this.userModel.findAndCountAll({
      where,
      ...toLimitOffset(query),
      order: [[query.sort, query.order]],
    });
    return {
      items: rows.map((u) => ({
        id: u.id,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
      })),
      pagination: buildPagination(query, count),
    };
  }
}
