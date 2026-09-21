import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Op, Transaction } from 'sequelize';
import {
  AdminProfile,
  PatientProfile,
  RefreshToken,
  Role,
  TherapistProfile,
  User,
  UserRole,
} from '@/database/models';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { AuditService } from '../audit/audit.service';
import { UpdatePatientProfileDto, UpdateTherapistProfileDto } from './dto/update-profile.dto';
import {
  AdminCreateUserDto,
  AdminResetPasswordDto,
  AdminUpdateAvatarDto,
  AdminUpdateUserDto,
  AdminUpdateUserStatusDto,
  AdminUsersQueryDto,
} from './dto/admin-users.dto';

/** Traducción de los roles que envía el panel a los códigos reales de la tabla `roles`. */
const ROLE_ALIASES: Record<string, string> = {
  PACIENTE: 'PATIENT',
  TERAPEUTA: 'THERAPIST',
  CONTADOR: 'ACCOUNTANT',
  PATIENT: 'PATIENT',
  THERAPIST: 'THERAPIST',
  ACCOUNTANT: 'ACCOUNTANT',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

/** `PENDING` es como lo nombra el panel; en la base el estado real es `PENDING_APPROVAL`. */
const STATUS_ALIASES: Record<string, string> = {
  PENDING: 'PENDING_APPROVAL',
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(PatientProfile) private readonly patientProfileModel: typeof PatientProfile,
    @InjectModel(TherapistProfile) private readonly therapistProfileModel: typeof TherapistProfile,
    @InjectModel(AdminProfile) private readonly adminProfileModel: typeof AdminProfile,
    @InjectModel(RefreshToken) private readonly refreshTokenModel: typeof RefreshToken,
    @InjectModel(Role) private readonly roleModel: typeof Role,
    @InjectModel(UserRole) private readonly userRoleModel: typeof UserRole,
    private readonly rolesPermissions: RolesPermissionsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
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

  // ---------------------------------------------------------------------------
  // Administración de usuarios
  // ---------------------------------------------------------------------------

  /**
   * Listado del panel. Devuelve los perfiles y el rol junto al usuario: sin ellos la
   * tabla solo podía mostrar el correo, y toda la columna «Usuario» quedaba en
   * «Sin nombre».
   */
  async list(query: AdminUsersQueryDto) {
    const conditions: Record<string | symbol, unknown>[] = [];
    if (query.search) {
      // La búsqueda por nombre se resuelve con los ids de los perfiles que coinciden,
      // no con la sintaxis `$asociacion.columna$`: esa depende de que el alias y el
      // nombre de columna generados coincidan exactamente, y ya rompió antes el
      // endpoint público de páginas por ese mismo motivo.
      const matchedUserIds = await this.userIdsMatchingName(query.search);
      conditions.push({
        [Op.or]: [
          { email: { [Op.iLike]: `%${query.search}%` } },
          ...(matchedUserIds.length ? [{ id: matchedUserIds }] : []),
        ],
      });
    }
    if (query.status) conditions.push({ status: this.normalizeStatus(query.status) });

    const { rows, count } = await this.userModel.findAndCountAll({
      where: conditions.length ? ({ [Op.and]: conditions } as any) : undefined,
      include: [PatientProfile, TherapistProfile, AdminProfile],
      ...toLimitOffset(query),
      order: [[query.sort, query.order]],
      distinct: true,
      subQuery: false,
    });

    const roleByUser = await this.rolesByUser(rows.map((user) => user.id));
    const requestedRole = query.role ? this.normalizeRole(query.role) : undefined;
    const items = rows
      .map((user) => this.serializeUser(user, roleByUser.get(user.id) ?? []))
      .filter((user) => !requestedRole || user.roles.includes(requestedRole));

    return {
      items,
      // Cuando se filtra por rol el total exacto solo se conoce tras filtrar en
      // memoria; devolver `count` sería mentirle a la paginación del panel.
      pagination: buildPagination(query, requestedRole ? items.length : count),
    };
  }

  async listPatients(query: PaginationQueryDto) {
    return this.list({ ...query, role: 'PATIENT' } as AdminUsersQueryDto);
  }

  async getUser(userId: string) {
    const user = await this.findUserOrFail(userId);
    const { roles } = await this.rolesPermissions.getUserRolesAndPermissions(userId);
    return this.serializeUser(user, roles);
  }

  /**
   * Alta desde el panel para cualquier rol. Antes solo existían los registros
   * públicos de paciente y terapeuta, así que admin, super admin y contador no se
   * podían crear desde ningún sitio.
   */
  async createUser(actorUserId: string, dto: AdminCreateUserDto) {
    const roleCode = this.normalizeRole(dto.role);
    const existing = await this.userModel.findOne({ where: { email: dto.email } });
    if (existing)
      throw new BadRequestException({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'El email ya está registrado.',
      });
    if (roleCode === 'THERAPIST' && (!dto.title || !dto.mainSpecialty))
      throw new BadRequestException({
        code: 'USER_THERAPIST_PROFILE_INCOMPLETE',
        message: 'Un terapeuta necesita título profesional y especialidad principal.',
      });

    const passwordHash = await this.hashPassword(dto.password);

    const created = await this.userModel.sequelize!.transaction(async (transaction) => {
      const user = await this.userModel.create(
        {
          email: dto.email,
          passwordHash,
          status: this.normalizeStatus(dto.status ?? 'ACTIVE'),
          emailVerifiedAt: new Date(),
        } as any,
        { transaction },
      );
      await this.createProfileFor(roleCode, user.id, dto, transaction);
      await this.rolesPermissions.assignRoleByCode(user.id, roleCode, transaction);
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_create_user',
          entityType: 'User',
          entityId: user.id,
          after: { email: user.email, role: roleCode, status: user.status },
        },
        { transaction },
      );
      return user;
    });

    return this.getUser(created.id);
  }

  async updateUser(actorUserId: string, userId: string, dto: AdminUpdateUserDto) {
    const user = await this.findUserOrFail(userId);
    const before = user.toJSON();

    if (dto.email && dto.email !== user.email) {
      const taken = await this.userModel.findOne({ where: { email: dto.email } });
      if (taken)
        throw new BadRequestException({
          code: 'AUTH_EMAIL_ALREADY_EXISTS',
          message: 'El email ya está registrado.',
        });
    }

    await this.userModel.sequelize!.transaction(async (transaction) => {
      if (dto.email) await user.update({ email: dto.email } as any, { transaction });

      const profileFields = {
        ...(dto.firstName ? { firstName: dto.firstName } : {}),
        ...(dto.lastName ? { lastName: dto.lastName } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
      };
      if (Object.keys(profileFields).length) {
        await this.updateAnyProfile(userId, profileFields, transaction);
      }

      if (dto.role) await this.replaceRole(userId, this.normalizeRole(dto.role), transaction);

      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_update_user',
          entityType: 'User',
          entityId: userId,
          before,
          after: dto as any,
        },
        { transaction },
      );
    });

    return this.getUser(userId);
  }

  async updateStatus(actorUserId: string, userId: string, dto: AdminUpdateUserStatusDto) {
    const user = await this.findUserOrFail(userId);
    const before = user.status;
    const status = this.normalizeStatus(dto.status);

    await this.userModel.sequelize!.transaction(async (transaction) => {
      await user.update({ status } as any, { transaction });
      // Bloquear a alguien que ya tiene sesión abierta no sirve de nada si su token
      // de refresco sigue siendo válido.
      if (status !== 'ACTIVE') await this.revokeSessions(userId, transaction);
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_update_status',
          entityType: 'User',
          entityId: userId,
          before: { status: before },
          after: { status },
        },
        { transaction },
      );
    });

    return this.getUser(userId);
  }

  async updateTherapistProfileByAdmin(
    actorUserId: string,
    userId: string,
    dto: UpdateTherapistProfileDto,
  ) {
    const profile = await this.therapistProfileModel.findByPk(userId);
    if (!profile)
      throw new NotFoundException({
        code: 'THERAPIST_PROFILE_NOT_FOUND',
        message: 'Perfil terapeuta no encontrado.',
      });
    const before = profile.toJSON();
    await this.therapistProfileModel.sequelize!.transaction(async (transaction) => {
      await profile.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_update_therapist_profile',
          entityType: 'TherapistProfile',
          entityId: userId,
          before,
          after: dto as any,
        },
        { transaction },
      );
    });
    return this.getUser(userId);
  }

  async updatePatientProfileByAdmin(
    actorUserId: string,
    userId: string,
    dto: UpdatePatientProfileDto,
  ) {
    const profile = await this.patientProfileModel.findByPk(userId);
    if (!profile)
      throw new NotFoundException({
        code: 'PATIENT_PROFILE_NOT_FOUND',
        message: 'Perfil paciente no encontrado.',
      });
    const before = profile.toJSON();
    await this.patientProfileModel.sequelize!.transaction(async (transaction) => {
      await profile.update(dto as any, { transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_update_patient_profile',
          entityType: 'PatientProfile',
          entityId: userId,
          before,
          after: dto as any,
        },
        { transaction },
      );
    });
    return this.getUser(userId);
  }

  async updateAvatar(actorUserId: string, userId: string, dto: AdminUpdateAvatarDto) {
    await this.findUserOrFail(userId);
    await this.userModel.sequelize!.transaction(async (transaction) => {
      const updated = await this.updateAnyProfile(
        userId,
        { avatarFileId: dto.avatarFileId },
        transaction,
      );
      if (!updated)
        throw new NotFoundException({
          code: 'USER_PROFILE_NOT_FOUND',
          message: 'El usuario no tiene un perfil donde guardar la foto.',
        });
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_update_avatar',
          entityType: 'User',
          entityId: userId,
          after: { avatarFileId: dto.avatarFileId },
        },
        { transaction },
      );
    });
    return this.getUser(userId);
  }

  /**
   * «Ya me había creado un usuario y no me acuerdo la contraseña»: administración
   * asigna una nueva y todas las sesiones anteriores dejan de valer.
   */
  async resetPasswordByAdmin(actorUserId: string, userId: string, dto: AdminResetPasswordDto) {
    const user = await this.findUserOrFail(userId);
    const passwordHash = await this.hashPassword(dto.newPassword);

    await this.userModel.sequelize!.transaction(async (transaction) => {
      await user.update({ passwordHash } as any, { transaction });
      await this.revokeSessions(userId, transaction);
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_reset_password',
          entityType: 'User',
          entityId: userId,
        },
        { transaction },
      );
    });

    return { success: true, id: userId, email: user.email };
  }

  /**
   * Baja lógica: `users` es `paranoid`, así que la fila se conserva y las citas
   * pasadas siguen teniendo a quién apuntar.
   */
  async deleteUser(actorUserId: string, userId: string) {
    if (actorUserId === userId)
      throw new BadRequestException({
        code: 'USER_CANNOT_DELETE_SELF',
        message: 'No puedes eliminar tu propio usuario.',
      });
    const user = await this.findUserOrFail(userId);
    const before = user.toJSON();

    await this.userModel.sequelize!.transaction(async (transaction) => {
      await user.update({ status: 'INACTIVE' } as any, { transaction });
      await this.revokeSessions(userId, transaction);
      await user.destroy({ transaction });
      await this.audit.log(
        {
          actorUserId,
          action: 'users.admin_delete_user',
          entityType: 'User',
          entityId: userId,
          before,
        },
        { transaction },
      );
    });

    return { success: true, id: userId };
  }

  // ---------------------------------------------------------------------------
  // Utilidades internas
  // ---------------------------------------------------------------------------

  private async findUserOrFail(userId: string) {
    const user = await this.userModel.findByPk(userId, {
      include: [PatientProfile, TherapistProfile, AdminProfile],
    });
    if (!user)
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' });
    return user;
  }

  private hashPassword(password: string) {
    return bcrypt.hash(password, this.config.get<number>('security.bcryptRounds') ?? 10);
  }

  private revokeSessions(userId: string, transaction: Transaction) {
    return this.refreshTokenModel.update(
      { revokedAt: new Date() },
      { where: { userId, revokedAt: null }, transaction },
    );
  }

  private normalizeRole(role: string) {
    const normalized = ROLE_ALIASES[String(role ?? '').trim().toUpperCase()];
    if (!normalized)
      throw new BadRequestException({ code: 'ROLE_NOT_FOUND', message: `Rol ${role} no existe.` });
    return normalized;
  }

  private normalizeStatus(status: string) {
    const raw = String(status ?? 'ACTIVE').trim().toUpperCase();
    return STATUS_ALIASES[raw] ?? raw;
  }

  /** Ids de usuario cuyo perfil (paciente, terapeuta o admin) coincide con el texto. */
  private async userIdsMatchingName(search: string) {
    const like = { [Op.iLike]: `%${search}%` };
    const where = { [Op.or]: [{ firstName: like }, { lastName: like }] } as any;
    const results = await Promise.all(
      [this.patientProfileModel, this.therapistProfileModel, this.adminProfileModel].map((model) =>
        (model as any).findAll({ where, attributes: ['userId'] }),
      ),
    );
    return [...new Set(results.flat().map((profile: any) => profile.userId as string))];
  }

  private async rolesByUser(userIds: string[]) {
    const map = new Map<string, string[]>();
    if (!userIds.length) return map;
    const userRoles = await this.userRoleModel.findAll({ where: { userId: userIds } });
    const roles = await this.roleModel.findAll({
      where: { id: [...new Set(userRoles.map((ur) => ur.roleId))] },
    });
    const codeById = new Map(roles.map((role) => [role.id, role.code]));
    for (const userRole of userRoles) {
      const code = codeById.get(userRole.roleId);
      if (!code) continue;
      map.set(userRole.userId, [...(map.get(userRole.userId) ?? []), code]);
    }
    return map;
  }

  private serializeUser(user: User, roles: string[]) {
    const profile = user.therapistProfile ?? user.patientProfile ?? user.adminProfile;
    const firstName = (profile as any)?.firstName ?? '';
    const lastName = (profile as any)?.lastName ?? '';
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      name: [firstName, lastName].filter(Boolean).join(' ').trim() || user.email,
      firstName,
      lastName,
      roles,
      role: roles[0] ?? null,
      avatarFileId: (profile as any)?.avatarFileId ?? null,
      patientProfile: user.patientProfile ?? null,
      therapistProfile: user.therapistProfile ?? null,
      adminProfile: user.adminProfile ?? null,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt ?? null,
    };
  }

  private async createProfileFor(
    roleCode: string,
    userId: string,
    dto: AdminCreateUserDto,
    transaction: Transaction,
  ) {
    const base = {
      userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    };
    if (roleCode === 'PATIENT') {
      await this.patientProfileModel.create(base as any, { transaction });
      return;
    }
    if (roleCode === 'THERAPIST') {
      await this.therapistProfileModel.create(
        {
          ...base,
          title: dto.title,
          mainSpecialty: dto.mainSpecialty,
          bio: dto.bio,
          personalPhrase: dto.personalPhrase,
          approvalStatus: 'APPROVED',
        } as any,
        { transaction },
      );
      return;
    }
    await this.adminProfileModel.create(
      { ...base, level: roleCode === 'SUPER_ADMIN' ? 'SUPER' : 'STANDARD' } as any,
      { transaction },
    );
  }

  /** Aplica los campos comunes al perfil que tenga el usuario, sea cual sea su rol. */
  private async updateAnyProfile(
    userId: string,
    fields: Record<string, unknown>,
    transaction: Transaction,
  ) {
    for (const model of [
      this.therapistProfileModel,
      this.patientProfileModel,
      this.adminProfileModel,
    ]) {
      const profile = await (model as any).findByPk(userId, { transaction });
      if (profile) {
        await profile.update(fields as any, { transaction });
        return true;
      }
    }
    return false;
  }

  private async replaceRole(userId: string, roleCode: string, transaction: Transaction) {
    await this.userRoleModel.destroy({ where: { userId }, transaction });
    await this.rolesPermissions.assignRoleByCode(userId, roleCode, transaction);
  }
}
