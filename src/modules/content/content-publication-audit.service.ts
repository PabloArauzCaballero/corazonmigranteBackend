import { Injectable } from '@nestjs/common';
import { ContentPublication } from '@/database/models';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ContentPublicationAuditService {
  constructor(private readonly audit: AuditService) {}

  async log(
    actorUserId: string,
    action: string,
    publication: ContentPublication,
    before?: unknown,
    transaction?: unknown,
  ) {
    await this.audit.log(
      {
        actorUserId,
        action: `content.publication.${action}`,
        entityType: 'ContentPublication',
        entityId: publication.id,
        before,
        after: publication.toJSON(),
      },
      { transaction: transaction as any },
    );
  }
}
