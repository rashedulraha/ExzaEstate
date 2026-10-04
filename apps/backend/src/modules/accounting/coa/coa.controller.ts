import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { CoaService } from './coa.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { QueryAccountDto } from './dto/query-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';
import { AccountBalanceResponseDto, AccountResponseDto } from './dto/account-response.dto.js';

@ApiTags('Accounting - Chart of Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/coa')
export class CoaController {
  constructor(private readonly coaService: CoaService) {}

  @Get()
  @RequirePermission(PERMISSIONS.COA_VIEW)
  @ApiOperation({ summary: 'List all accounts for the current company' })
  @ApiResponse({ status: 200, type: [AccountResponseDto] })
  async getAccounts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAccountDto,
  ): Promise<AccountResponseDto[]> {
    return this.coaService.getAccounts(user.companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.COA_VIEW)
  @ApiOperation({ summary: 'Get account details by ID' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async getAccountById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
  ): Promise<AccountResponseDto> {
    return this.coaService.getAccountById(user.companyId, id);
  }

  @Get(':id/balance')
  @RequirePermission(PERMISSIONS.COA_VIEW)
  @ApiOperation({ summary: 'Get account ledger balance' })
  @ApiResponse({ status: 200, type: AccountBalanceResponseDto })
  async getAccountBalance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
  ): Promise<AccountBalanceResponseDto> {
    return this.coaService.getAccountBalance(user.companyId, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.COA_CREATE)
  @ApiOperation({ summary: 'Create a new account in Chart of Accounts' })
  @ApiResponse({ status: 201, type: AccountResponseDto })
  async createAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.coaService.createAccount(user.companyId, dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.COA_EDIT)
  @ApiOperation({ summary: 'Update an account in Chart of Accounts' })
  @ApiResponse({ status: 200, type: AccountResponseDto })
  async updateAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe({ version: '7' })) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.coaService.updateAccount(user.companyId, id, dto);
  }
}
