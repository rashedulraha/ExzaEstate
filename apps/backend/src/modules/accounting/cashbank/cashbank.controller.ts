import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator.js';
import { CashBankService } from './cashbank.service.js';
import { CashTransferService } from './cash-transfer.service.js';
import { BankReconciliationService } from './bank-reconciliation.service.js';
import {
  BankAccountResponseDto,
  BankBranchRefDto,
  BankRefDto,
  CreateBankAccountDto,
  UpdateBankAccountDto,
} from './dto/bank-account.dto.js';
import { CashTransferResponseDto, CreateCashTransferDto } from './dto/cash-transfer.dto.js';
import {
  BankReconciliationResponseDto,
  CreateBankReconciliationDto,
  MatchReconciliationItemsRequestDto,
  UnreconciledLineDto,
} from './dto/bank-reconciliation.dto.js';

@ApiTags('Accounting - Cash & Bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/cashbank')
export class CashBankController {
  constructor(
    private readonly cashBankService: CashBankService,
    private readonly cashTransferService: CashTransferService,
    private readonly bankReconciliationService: BankReconciliationService,
  ) {}

  @Get('banks')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'List all global reference banks and branches' })
  @ApiResponse({ status: 200, type: [BankRefDto] })
  async listGlobalBanks(): Promise<BankRefDto[]> {
    return this.cashBankService.listGlobalBanks();
  }

  @Get('banks/:bankId/branches')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'List branches for a global bank' })
  @ApiResponse({ status: 200, type: [BankBranchRefDto] })
  async listBranches(@Param('bankId') bankId: string): Promise<BankBranchRefDto[]> {
    return this.cashBankService.listBranches(bankId);
  }

  @Post('accounts')
  @RequirePermission(PERMISSIONS.CASHBANK_CREATE)
  @ApiOperation({ summary: 'Create a company bank, cash, or wallet account' })
  @ApiResponse({ status: 201, type: BankAccountResponseDto })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.cashBankService.create(user.companyId, user.userId, dto);
  }

  @Get('accounts')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'List all company cash and bank accounts with current balances' })
  @ApiResponse({ status: 200, type: [BankAccountResponseDto] })
  async listAccounts(
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountType') accountType?: string,
    @Query('isActive') isActive?: string,
  ): Promise<BankAccountResponseDto[]> {
    return this.cashBankService.findAll(user.companyId, {
      accountType,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('accounts/:id')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'Get details of a company bank or cash account' })
  @ApiResponse({ status: 200, type: BankAccountResponseDto })
  async getAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BankAccountResponseDto> {
    return this.cashBankService.findById(user.companyId, id);
  }

  @Patch('accounts/:id')
  @RequirePermission(PERMISSIONS.CASHBANK_EDIT)
  @ApiOperation({ summary: 'Update details of a company bank or cash account' })
  @ApiResponse({ status: 200, type: BankAccountResponseDto })
  async updateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
  ): Promise<BankAccountResponseDto> {
    return this.cashBankService.update(user.companyId, user.userId, id, dto);
  }

  @Post('transfers')
  @RequirePermission(PERMISSIONS.CASHBANK_CREATE)
  @ApiOperation({ summary: 'Post an internal transfer between cash/bank accounts' })
  @ApiResponse({ status: 201, type: CashTransferResponseDto })
  async transfer(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCashTransferDto,
  ): Promise<CashTransferResponseDto> {
    return this.cashTransferService.transfer(user.companyId, user.userId, dto);
  }

  @Get('transfers')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'List all cash transfers' })
  @ApiResponse({ status: 200, type: [CashTransferResponseDto] })
  async listTransfers(@CurrentUser() user: AuthenticatedUser): Promise<CashTransferResponseDto[]> {
    return this.cashTransferService.findAll(user.companyId);
  }

  @Get('transfers/:id')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'Get details of a cash transfer' })
  @ApiResponse({ status: 200, type: CashTransferResponseDto })
  async getTransfer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<CashTransferResponseDto> {
    return this.cashTransferService.findById(user.companyId, id);
  }

  @Post('reconciliations')
  @RequirePermission(PERMISSIONS.CASHBANK_CREATE)
  @ApiOperation({ summary: 'Create a draft bank reconciliation session' })
  @ApiResponse({ status: 201, type: BankReconciliationResponseDto })
  async createReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBankReconciliationDto,
  ): Promise<BankReconciliationResponseDto> {
    return this.bankReconciliationService.create(user.companyId, user.userId, dto);
  }

  @Get('reconciliations')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'List bank reconciliations' })
  @ApiResponse({ status: 200, type: [BankReconciliationResponseDto] })
  async listReconciliations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('bankAccountId') bankAccountId?: string,
  ): Promise<BankReconciliationResponseDto[]> {
    return this.bankReconciliationService.findAll(user.companyId, bankAccountId);
  }

  @Get('reconciliations/:id')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'Get bank reconciliation details' })
  @ApiResponse({ status: 200, type: BankReconciliationResponseDto })
  async getReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BankReconciliationResponseDto> {
    return this.bankReconciliationService.findById(user.companyId, id);
  }

  @Get('reconciliations/:id/unreconciled-lines')
  @RequirePermission(PERMISSIONS.CASHBANK_VIEW)
  @ApiOperation({ summary: 'Get unreconciled journal lines for this reconciliation' })
  @ApiResponse({ status: 200, type: [UnreconciledLineDto] })
  async getUnreconciledLines(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<UnreconciledLineDto[]> {
    return this.bankReconciliationService.getUnreconciledLines(user.companyId, id);
  }

  @Post('reconciliations/:id/match')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CASHBANK_EDIT)
  @ApiOperation({ summary: 'Match and tick off cleared journal lines in reconciliation' })
  @ApiResponse({ status: 200, type: BankReconciliationResponseDto })
  async matchItems(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MatchReconciliationItemsRequestDto,
  ): Promise<BankReconciliationResponseDto> {
    return this.bankReconciliationService.matchItems(user.companyId, user.userId, id, dto);
  }

  @Post('reconciliations/:id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.CASHBANK_EDIT)
  @ApiOperation({ summary: 'Finalize and complete a balanced bank reconciliation' })
  @ApiResponse({ status: 200, type: BankReconciliationResponseDto })
  async completeReconciliation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BankReconciliationResponseDto> {
    return this.bankReconciliationService.complete(user.companyId, user.userId, id);
  }
}
