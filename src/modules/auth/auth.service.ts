import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { Op, Transaction } from 'sequelize';
import { AuthPin, PatientProfile, RefreshToken, TherapistProfile, User } from '@/database/models';
import { sha256, randomOpaqueToken } from '@/common/utils/hash.util';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { AuditService } from '../audit/audit.service';
import { MessagingService } from '../messaging/messaging.service';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { RegisterTherapistDto } from './dto/register-therapist.dto';
import { ResetPasswordDto } from './dto/password-reset.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(PatientProfile) private readonly patientProfileModel: typeof PatientProfile,
    @InjectModel(TherapistProfile) private readonly therapistProfileModel: typeof TherapistProfile,
    @InjectModel(RefreshToken) private readonly refreshTokenModel: typeof RefreshToken,
    @InjectModel(AuthPin) private readonly authPinModel: typeof AuthPin,
    private readonly rolesPermissions: RolesPermissionsService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly messaging: MessagingService,
  ) {}

  async registerPatient(dto: RegisterPatientDto) {
    await this.assertEmailAvailable(dto.email);
    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>('security.bcryptRounds') ?? 10,
    );

    const user = await this.userModel.sequelize!.transaction(async (transaction) => {
      const createdUser = await this.userModel.create(
        {
          email: dto.email,
          passwordHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        } as any,
        { transaction },
      );
      await this.patientProfileModel.create(
        {
          userId: createdUser.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          birthDate: dto.birthDate,
          country: dto.country,
          city: dto.city,
          occupation: dto.occupation,
        } as any,
        { transaction },
      );
      await this.rolesPermissions.assignRoleByCode(createdUser.id, 'PATIENT', transaction);
      await this.audit.log(
        {
          actorUserId: createdUser.id,
          action: 'auth.register_patient',
          entityType: 'User',
          entityId: createdUser.id,
          after: { email: createdUser.email },
        },
        { transaction },
      );
      await this.messaging.enqueue(
        {
          channel: 'EMAIL',
          recipient: createdUser.email,
          templateCode: 'WELCOME_PATIENT',
          payload: { email: createdUser.email },
        },
        { transaction },
      );
      return createdUser;
    });

    return this.publicUser(user);
  }

  async registerTherapist(dto: RegisterTherapistDto) {
    await this.assertEmailAvailable(dto.email);
    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.get<number>('security.bcryptRounds') ?? 10,
    );

    const user = await this.userModel.sequelize!.transaction(async (transaction) => {
      const createdUser = await this.userModel.create(
        {
          email: dto.email,
          passwordHash,
          status: 'PENDING_APPROVAL',
          emailVerifiedAt: new Date(),
        } as any,
        { transaction },
      );
      await this.therapistProfileModel.create(
        {
          userId: createdUser.id,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          title: dto.title,
          mainSpecialty: dto.mainSpecialty,
          bio: dto.bio,
          personalPhrase: dto.personalPhrase,
          youtubeUrl: dto.youtubeUrl,
          licenseNumber: dto.licenseNumber,
          country: dto.country,
          city: dto.city,
          baseSessionPrice: dto.baseSessionPrice,
          approvalStatus: 'PENDING',
        } as any,
        { transaction },
      );
      await this.rolesPermissions.assignRoleByCode(createdUser.id, 'THERAPIST', transaction);
      await this.audit.log(
        {
          actorUserId: createdUser.id,
          action: 'auth.register_therapist',
          entityType: 'User',
          entityId: createdUser.id,
          after: { email: createdUser.email, status: createdUser.status },
        },
        { transaction },
      );
      return createdUser;
    });

    return this.publicUser(user);
  }

  async login(dto: LoginDto, meta: { ipAddress?: string; userAgent?: string } = {}) {
    const user = await this.userModel.findOne({ where: { email: dto.email } });
    if (!user)
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Credenciales inválidas.',
      });
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok)
      throw new UnauthorizedException({
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Credenciales inválidas.',
      });
    if (user.status !== 'ACTIVE')
      throw new ForbiddenException({ code: 'AUTH_USER_DISABLED', message: 'Usuario no activo.' });

    return this.userModel.sequelize!.transaction(async (transaction) => {
      user.lastLoginAt = new Date();
      await user.save({ transaction });
      return this.issueTokenPair(user, meta, transaction);
    });
  }

  async refresh(refreshToken: string, meta: { ipAddress?: string; userAgent?: string } = {}) {
    const tokenHash = sha256(refreshToken);

    return this.refreshTokenModel.sequelize!.transaction(async (transaction) => {
      const current = await this.refreshTokenModel.findOne({
        where: { tokenHash, revokedAt: null, expiresAt: { [Op.gt]: new Date() } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!current)
        throw new UnauthorizedException({
          code: 'AUTH_INVALID_REFRESH_TOKEN',
          message: 'Refresh token inválido.',
        });
      const user = await this.userModel.findByPk(current.userId, { transaction });
      if (!user || user.status !== 'ACTIVE')
        throw new UnauthorizedException({
          code: 'AUTH_INVALID_REFRESH_TOKEN',
          message: 'Refresh token inválido.',
        });
      const pair = await this.issueTokenPair(user, meta, transaction);
      current.revokedAt = new Date();
      current.replacedByTokenId = pair.refreshTokenId;
      await current.save({ transaction });
      return pair;
    });
  }

  async logout(refreshToken: string) {
    const tokenHash = sha256(refreshToken);
    await this.refreshTokenModel.sequelize!.transaction(async (transaction) => {
      const token = await this.refreshTokenModel.findOne({ where: { tokenHash }, transaction });
      if (token && !token.revokedAt) {
        token.revokedAt = new Date();
        await token.save({ transaction });
      }
    });
    return { success: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userModel.findOne({ where: { email } });
    if (!user) return { success: true }; // No revelar si el email existe.
    const pin = String(Math.floor(100000 + Math.random() * 900000));

    await this.authPinModel.sequelize!.transaction(async (transaction) => {
      await this.authPinModel.create(
        {
          email,
          pinHash: sha256(pin),
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          metadata: { note: 'En desarrollo el PIN queda en payload del outbox.' },
        } as any,
        { transaction },
      );
      await this.messaging.enqueue(
        {
          channel: 'EMAIL',
          recipient: email,
          templateCode: 'PASSWORD_RESET_PIN',
          payload: { pin },
        },
        { transaction },
      );
    });

    return { success: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.authPinModel.sequelize!.transaction(async (transaction) => {
      const pin = await this.authPinModel.findOne({
        where: {
          email: dto.email,
          purpose: 'PASSWORD_RESET',
          consumedAt: null,
          expiresAt: { [Op.gt]: new Date() },
        },
        order: [['createdAt', 'DESC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!pin || pin.pinHash !== sha256(dto.pin))
        throw new BadRequestException({
          code: 'AUTH_INVALID_PIN',
          message: 'PIN inválido o expirado.',
        });
      const user = await this.userModel.findOne({ where: { email: dto.email }, transaction });
      if (!user)
        throw new BadRequestException({
          code: 'AUTH_INVALID_PIN',
          message: 'PIN inválido o expirado.',
        });
      user.passwordHash = await bcrypt.hash(
        dto.newPassword,
        this.config.get<number>('security.bcryptRounds') ?? 10,
      );
      pin.consumedAt = new Date();
      await user.save({ transaction });
      await pin.save({ transaction });
      await this.refreshTokenModel.update(
        { revokedAt: new Date() },
        { where: { userId: user.id, revokedAt: null }, transaction },
      );
      await this.audit.log(
        {
          actorUserId: user.id,
          action: 'auth.password_reset',
          entityType: 'User',
          entityId: user.id,
        },
        { transaction },
      );
      return { success: true };
    });
  }

  private async issueTokenPair(
    user: User,
    meta: { ipAddress?: string; userAgent?: string },
    transaction?: Transaction,
  ) {
    const { roles, permissions } = await this.rolesPermissions.getUserRolesAndPermissions(user.id);
    const payload = { sub: user.id, email: user.email, roles, permissions, status: user.status };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') as any,
    });
    const refreshToken = randomOpaqueToken();
    const refreshTokenModel = await this.refreshTokenModel.create(
      {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(
          Date.now() +
            (this.config.get<number>('jwt.refreshExpiresDays') ?? 30) * 24 * 60 * 60 * 1000,
        ),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      } as any,
      { transaction },
    );
    return {
      accessToken,
      refreshToken,
      refreshTokenId: refreshTokenModel.id,
      expiresIn: 900,
      user: { id: user.id, email: user.email, roles, permissions, status: user.status },
    };
  }

  private async assertEmailAvailable(email: string) {
    const existing = await this.userModel.findOne({ where: { email } });
    if (existing)
      throw new BadRequestException({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
        message: 'El email ya está registrado.',
      });
  }

  private publicUser(user: User) {
    return { id: user.id, email: user.email, status: user.status };
  }
}
