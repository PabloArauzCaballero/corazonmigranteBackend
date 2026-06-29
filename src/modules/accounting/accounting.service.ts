import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  Account,
  AccountGroup,
  AccountingEntry,
  AccountingTransaction,
  CostCenter,
} from '@/database/models';
import {
  PaginationQueryDto,
  buildPagination,
  toLimitOffset,
} from '@/common/pagination/pagination.dto';
import { AuditService } from '../audit/audit.service';
import {
  CreateAccountDto,
  CreateAccountGroupDto,
  CreateCostCenterDto,
  CreateTransactionDto,
} from './dto/accounting.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectModel(AccountGroup) private readonly groupModel: typeof AccountGroup,
    @InjectModel(Account) private readonly accountModel: typeof Account,
    @InjectModel(CostCenter) private readonly costCenterModel: typeof CostCenter,
    @InjectModel(AccountingTransaction) private readonly txModel: typeof AccountingTransaction,
    @InjectModel(AccountingEntry) private readonly entryModel: typeof AccountingEntry,
    private readonly audit: AuditService,
  ) {}
  listGroups(query: PaginationQueryDto) {
    return this.groupModel
      .findAndCountAll({ ...toLimitOffset(query), order: [['code', 'ASC']] })
      .then(({ rows, count }) => ({ items: rows, pagination: buildPagination(query, count) }));
  }
  createGroup(actorUserId: string, dto: CreateAccountGroupDto) {
    return this.groupModel.sequelize!.transaction(async (transaction) => {
      const row = await this.groupModel.create({ ...dto, status: 'ACTIVE' } as any, {
        transaction,
      });
      await this.audit.log(
        {
          actorUserId,
          action: 'accounting.create_group',
          entityType: 'AccountGroup',
          entityId: row.id,
          after: row.toJSON(),
        },
        { transaction },
      );
      return row;
    });
  }
  listAccounts(query: PaginationQueryDto) {
    return this.accountModel
      .findAndCountAll({ ...toLimitOffset(query), order: [['code', 'ASC']] })
      .then(({ rows, count }) => ({ items: rows, pagination: buildPagination(query, count) }));
  }
  createAccount(actorUserId: string, dto: CreateAccountDto) {
    return this.accountModel.sequelize!.transaction(async (transaction) => {
      const row = await this.accountModel.create({ ...dto, status: 'ACTIVE' } as any, {
        transaction,
      });
      await this.audit.log(
        {
          actorUserId,
          action: 'accounting.create_account',
          entityType: 'Account',
          entityId: row.id,
          after: row.toJSON(),
        },
        { transaction },
      );
      return row;
    });
  }
  createCostCenter(actorUserId: string, dto: CreateCostCenterDto) {
    return this.costCenterModel.sequelize!.transaction(async (transaction) => {
      const row = await this.costCenterModel.create({ ...dto, status: 'ACTIVE' } as any, {
        transaction,
      });
      await this.audit.log(
        {
          actorUserId,
          action: 'accounting.create_cost_center',
          entityType: 'CostCenter',
          entityId: row.id,
          after: row.toJSON(),
        },
        { transaction },
      );
      return row;
    });
  }
  async createTransaction(actorUserId: string, dto: CreateTransactionDto) {
    const debit = dto.entries.reduce((sum, e) => sum + Number(e.debit), 0);
    const credit = dto.entries.reduce((sum, e) => sum + Number(e.credit), 0);
    if (Math.round(debit * 100) !== Math.round(credit * 100))
      throw new BadRequestException({
        code: 'ACCOUNTING_UNBALANCED_TRANSACTION',
        message: 'La transacción debe estar balanceada.',
      });
    if (dto.entries.length < 2)
      throw new BadRequestException({
        code: 'ACCOUNTING_MINIMUM_ENTRIES',
        message: 'Se requieren al menos dos asientos.',
      });
    return this.txModel.sequelize!.transaction(async (transaction) => {
      const created = await this.txModel.create(
        {
          date: dto.date,
          description: dto.description,
          reference: dto.reference,
          status: 'POSTED',
          createdByUserId: actorUserId,
        } as any,
        { transaction },
      );
      await this.entryModel.bulkCreate(
        dto.entries.map((e) => ({
          transactionId: created.id,
          accountId: e.accountId,
          costCenterId: e.costCenterId,
          debit: e.debit,
          credit: e.credit,
        })) as any,
        { transaction },
      );
      await this.audit.log(
        {
          actorUserId,
          action: 'accounting.create_transaction',
          entityType: 'AccountingTransaction',
          entityId: created.id,
          after: { debit, credit },
        },
        { transaction },
      );
      return created;
    });
  }
}
