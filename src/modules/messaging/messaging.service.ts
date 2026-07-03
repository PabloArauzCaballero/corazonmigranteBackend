import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import * as sgMail from '@sendgrid/mail';
import { MessageOutbox, MessageSendLog } from '@/database/models';
import { SendTestEmailDto } from './dto/test-email.dto';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';

const EMAIL_CHANNEL = 'EMAIL';
const PROVIDER_DEV_NULL = 'DEV_NULL';
const PROVIDER_SENDGRID = 'SENDGRID';

const DB_PENDING = 'PENDIENTE';
const DB_PROCESSING = 'PROCESANDO';
const DB_SENT = 'ENVIADO';
const DB_FAILED = 'FALLIDO';
const DB_CANCELLED = 'CANCELADO';

const API_STATUS: Record<string, string> = {
  [DB_PENDING]: 'PENDING',
  [DB_PROCESSING]: 'PROCESSING',
  [DB_SENT]: 'SENT',
  [DB_FAILED]: 'FAILED',
  [DB_CANCELLED]: 'CANCELLED',
};

type EmailPayload = {
  subject?: string;
  text?: string;
  html?: string;
  fromEmail?: string;
  fromName?: string;
};

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    @InjectModel(MessageOutbox) private readonly outboxModel: typeof MessageOutbox,
    @InjectModel(MessageSendLog) private readonly logModel: typeof MessageSendLog,
    private readonly config: ConfigService,
  ) {}

  async enqueue(
    input: {
      channel: string;
      recipient: string;
      templateCode: string;
      payload: Record<string, unknown>;
      scheduledAt?: Date;
    },
    options: { transaction?: Transaction } = {},
  ) {
    return this.outboxModel.create(
      {
        channel: input.channel,
        recipient: input.recipient,
        templateCode: input.templateCode,
        payload: input.payload,
        scheduledAt: input.scheduledAt ?? new Date(),
        status: DB_PENDING,
        priority: 5,
        attempts: 0,
        maxAttempts: 6,
      } as any,
      { transaction: options.transaction },
    );
  }

  async enqueueTestEmail(dto: SendTestEmailDto) {
    const now = new Date().toISOString();
    return this.toApiOutbox(
      await this.enqueue({
        channel: EMAIL_CHANNEL,
        recipient: dto.recipient,
        templateCode: 'SMOKE_TEST_EMAIL',
        payload: {
          subject: dto.subject ?? `Corazon Migrante - smoke test ${now}`,
          text:
            dto.text ??
            `Correo de prueba enviado por el smoke test profundo de Corazon Migrante. Fecha UTC: ${now}`,
          html: `<p>Correo de prueba enviado por el smoke test profundo de <strong>Corazon Migrante</strong>.</p><p>Fecha UTC: ${now}</p>`,
        },
      }),
    );
  }

  async list(query: PaginationQueryDto) {
    const { rows, count } = await this.outboxModel.findAndCountAll({
      ...toLimitOffset(query),
      order: [['createdAt', 'DESC']],
    });
    return {
      items: rows.map((row) => this.toApiOutbox(row)),
      pagination: buildPagination(query, count),
    };
  }

  async processPending(limit = 20) {
    const pending = await this.outboxModel.findAll({
      where: { status: DB_PENDING, scheduledAt: { [Op.lte]: new Date() } },
      limit,
      order: [
        ['priority', 'ASC'],
        ['scheduledAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return this.processBatch(pending);
  }

  async processOne(id: string | number) {
    const message = await this.outboxModel.findByPk(id as any);
    if (!message)
      throw new NotFoundException({
        code: 'OUTBOX_NOT_FOUND',
        message: 'No existe el mensaje solicitado.',
      });
    return this.processBatch([message]);
  }

  private async processBatch(messages: MessageOutbox[]) {
    let sent = 0;
    let failed = 0;
    const results: Array<Record<string, unknown>> = [];

    for (const message of messages) {
      if (![DB_PENDING, DB_PROCESSING].includes(message.status)) {
        results.push({
          id: message.id,
          status: this.toApiStatus(message.status),
          rawStatus: message.status,
          skipped: true,
          lastError: message.lastError,
        });
        continue;
      }

      message.status = DB_PROCESSING;
      message.lockedAt = new Date();
      message.lockedBy = `api-${process.pid}`;
      message.attempts += 1;
      await message.save();

      try {
        const result = await this.send(message);
        message.status = DB_SENT;
        message.sentAt = new Date();
        message.lockedAt = undefined;
        message.lockedBy = undefined;
        message.lastError = undefined;
        await message.save();
        await this.logModel.create({
          outboxId: message.id,
          ok: true,
          providerMessageId: result.providerMessageId,
          responseMetadata: { provider: result.provider, ...result.metadata },
        } as any);
        sent += 1;
        results.push({
          id: message.id,
          status: 'SENT',
          rawStatus: DB_SENT,
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          responseMetadata: result.metadata,
        });
      } catch (error) {
        const normalized = this.normalizeProviderError(error);
        message.status = message.attempts >= message.maxAttempts ? DB_FAILED : DB_PENDING;
        message.lockedAt = undefined;
        message.lockedBy = undefined;
        message.lastError = normalized.message;
        await message.save();
        await this.logModel.create({
          outboxId: message.id,
          ok: false,
          providerMessageId: undefined,
          responseMetadata: normalized.metadata,
          error: normalized.message,
        } as any);
        this.logger.error(`No se pudo enviar mensaje ${message.id}: ${normalized.message}`);
        failed += 1;
        results.push({
          id: message.id,
          status: this.toApiStatus(message.status),
          rawStatus: message.status,
          recipient: message.recipient,
          provider: this.currentEmailProvider,
          lastError: normalized.message,
          responseMetadata: normalized.metadata,
        });
      }
    }

    return { processed: messages.length, sent, failed, results };
  }

  private get currentEmailProvider() {
    return (this.config.get<string>('email.provider') ?? PROVIDER_DEV_NULL).toUpperCase();
  }

  private async send(
    message: MessageOutbox,
  ): Promise<{ provider: string; providerMessageId?: string; metadata: Record<string, unknown> }> {
    if (message.channel !== EMAIL_CHANNEL) {
      return this.sendDevNull(message, { reason: 'CHANNEL_NOT_IMPLEMENTED' });
    }

    const provider = this.currentEmailProvider;
    if (provider === PROVIDER_SENDGRID) {
      return this.sendEmailWithSendGrid(message);
    }

    return this.sendDevNull(message, { reason: 'EMAIL_PROVIDER_DEV_NULL' });
  }

  private sendDevNull(message: MessageOutbox, metadata: Record<string, unknown>) {
    return {
      provider: PROVIDER_DEV_NULL,
      providerMessageId: `dev-${message.id}`,
      metadata: {
        simulated: true,
        channel: message.channel,
        templateCode: message.templateCode,
        ...metadata,
      },
    };
  }

  private async sendEmailWithSendGrid(message: MessageOutbox) {
    const apiKey = this.config.get<string>('email.sendgrid.apiKey');
    const defaultFromEmail = this.config.get<string>('email.fromEmail');
    const defaultFromName = this.config.get<string>('email.fromName') ?? 'Corazon Migrante';
    const replyTo = this.config.get<string>('email.replyTo') || undefined;

    if (!apiKey)
      throw new BadRequestException({
        code: 'SENDGRID_API_KEY_REQUIRED',
        message: 'Debe configurar SENDGRID_API_KEY.',
      });
    if (!defaultFromEmail)
      throw new BadRequestException({
        code: 'EMAIL_FROM_EMAIL_REQUIRED',
        message: 'Debe configurar EMAIL_FROM_EMAIL.',
      });

    const payload = message.payload as EmailPayload;
    const subject = payload.subject ?? this.buildFallbackSubject(message.templateCode);
    const text = payload.text ?? this.buildFallbackText(message.templateCode, payload);
    const html = payload.html;

    sgMail.setApiKey(apiKey.trim());
    const [response] = await sgMail.send({
      to: message.recipient,
      from: {
        email: payload.fromEmail ?? defaultFromEmail,
        name: payload.fromName ?? defaultFromName,
      },
      subject,
      text,
      html,
      replyTo,
    });

    return {
      provider: PROVIDER_SENDGRID,
      providerMessageId: response.headers?.['x-message-id'] as string | undefined,
      metadata: {
        statusCode: response.statusCode,
        headers: response.headers,
      },
    };
  }

  private buildFallbackSubject(templateCode: string) {
    return `Corazon Migrante - ${templateCode}`;
  }

  private buildFallbackText(templateCode: string, payload: EmailPayload) {
    return payload.text ?? `Mensaje automatico de Corazon Migrante. Plantilla: ${templateCode}`;
  }

  private normalizeProviderError(error: unknown) {
    const anyError = error as any;
    const responseBody = anyError?.response?.body;
    const responseHeaders = anyError?.response?.headers;
    const responseCode = anyError?.code ?? anyError?.response?.statusCode;
    const errorMessage =
      responseBody?.errors?.[0]?.message ?? anyError?.message ?? 'Unknown messaging error';

    return {
      message: String(errorMessage),
      metadata: {
        code: responseCode,
        errors: responseBody?.errors,
        body: responseBody,
        headers: responseHeaders,
      },
    };
  }

  private toApiOutbox(row: MessageOutbox) {
    return {
      id: row.id,
      channel: row.channel,
      recipient: row.recipient,
      templateCode: row.templateCode,
      payload: row.payload,
      status: this.toApiStatus(row.status),
      rawStatus: row.status,
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      scheduledAt: row.scheduledAt,
      lockedAt: row.lockedAt,
      lockedBy: row.lockedBy,
      lastError: row.lastError,
      createdAt: row.createdAt,
      sentAt: row.sentAt,
    };
  }

  private toApiStatus(status: string) {
    return API_STATUS[status] ?? status;
  }
}
