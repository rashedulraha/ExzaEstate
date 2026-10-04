import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { JournalService } from './journal.service.js';
import { CreateJournalDto } from './dto/create-journal.dto.js';
import { QueryJournalDto } from './dto/query-journal.dto.js';
import { ReverseJournalDto } from './dto/reverse-journal.dto.js';
import { JournalResponseDto } from './dto/journal-response.dto.js';

@ApiTags('Accounting - Journals & Double-Entry Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('accounting/journals')
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  @RequirePermission(PERMISSIONS.JOURNAL_VIEW)
  @ApiOperation({ summary: 'List journals with optional filters and pagination' })
  @ApiResponse({ status: 200, type: [JournalResponseDto] })
  async getJournals(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryJournalDto,
  ): Promise<{ data: JournalResponseDto[]; total: number; page: number; limit: number }> {
    return this.journalService.getJournals(user.companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.JOURNAL_VIEW)
  @ApiOperation({ summary: 'Get journal details by ID including lines and reversals' })
  @ApiResponse({ status: 200, type: JournalResponseDto })
  async getJournalById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JournalResponseDto> {
    return this.journalService.getJournalById(user.companyId, id);
  }

  @Post('draft')
  @RequirePermission(PERMISSIONS.JOURNAL_CREATE)
  @ApiOperation({ summary: 'Create a draft journal voucher' })
  @ApiResponse({ status: 201, type: JournalResponseDto })
  async createDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalDto,
  ): Promise<JournalResponseDto> {
    return this.journalService.createDraft(user.companyId, user.userId, dto);
  }

  @Post('post')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.JOURNAL_POST)
  @ApiOperation({ summary: 'Create and immediately post a balanced journal voucher' })
  @ApiResponse({ status: 200, type: JournalResponseDto })
  async createAndPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateJournalDto,
  ): Promise<JournalResponseDto> {
    return this.journalService.createAndPost(user.companyId, user.userId, dto);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.JOURNAL_POST)
  @ApiOperation({ summary: 'Post an existing draft/review journal voucher' })
  @ApiResponse({ status: 200, type: JournalResponseDto })
  async postDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<JournalResponseDto> {
    return this.journalService.postDraft(user.companyId, id, user.userId);
  }

  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.JOURNAL_REVERSE)
  @ApiOperation({ summary: 'Reverse and correct a posted journal voucher (creates mirror entry)' })
  @ApiResponse({ status: 200, type: JournalResponseDto })
  async reverseAndCorrect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReverseJournalDto,
  ): Promise<JournalResponseDto> {
    return this.journalService.reverseAndCorrect(user.companyId, id, user.userId, dto);
  }
}
