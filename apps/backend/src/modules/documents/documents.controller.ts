import {
  Body,
  Controller,
  Delete,
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
import { ClsService } from 'nestjs-cls';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { DocumentExpiryService, type ExpiryProcessResult } from './document-expiry.service.js';
import { DocumentsService } from './documents.service.js';
import {
  CreateDocumentDto,
  CreateVersionDto,
  DocumentResponseDto,
  PresignDownloadResponseDto,
  PresignUploadDto,
  PresignUploadResponseDto,
  QueryDocumentDto,
} from './dto/index.js';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly expiryService: DocumentExpiryService,
    private readonly cls: ClsService,
  ) {}

  @Post('presign-upload')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.DOCUMENT_CREATE)
  @ApiOperation({
    summary: 'Request presigned direct upload URL (S1)',
    description:
      'Validates MIME type, file size, and malware/virus signatures before issuing presigned URL.',
  })
  @ApiResponse({ status: 200, type: PresignUploadResponseDto })
  async presignUpload(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: PresignUploadDto,
  ): Promise<PresignUploadResponseDto> {
    return this.documentsService.presignUpload(companyId, dto);
  }

  @Post('process-expiry')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(PERMISSIONS.DOCUMENT_VIEW)
  @ApiOperation({
    summary: 'Trigger document expiration scan for company (S3)',
    description: 'Marks expired documents and emits outbox events for notification generation.',
  })
  async processExpiry(@CurrentUser('companyId') companyId: string): Promise<ExpiryProcessResult> {
    return this.expiryService.processExpiredDocumentsForCompany(companyId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.DOCUMENT_CREATE)
  @ApiOperation({
    summary: 'Register and confirm uploaded document (S1)',
    description: 'Verifies storage key, initializes document record and initial version (v1).',
  })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  async createDocument(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.createDocument(companyId, userId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.DOCUMENT_VIEW)
  @ApiOperation({
    summary: 'List polymorphic documents (S2)',
    description: 'Filter documents attached to entityType and entityId with pagination.',
  })
  async findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryDocumentDto,
  ): Promise<{ data: DocumentResponseDto[]; total: number; page: number; pageSize: number }> {
    const userPermissions = this.cls.get<string[]>('permissions') ?? [];
    return this.documentsService.findAll(companyId, userPermissions, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.DOCUMENT_VIEW)
  @ApiOperation({
    summary: 'Get document details with version history (S2)',
  })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async findById(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DocumentResponseDto> {
    const userPermissions = this.cls.get<string[]>('permissions') ?? [];
    return this.documentsService.findById(companyId, userPermissions, id);
  }

  @Get(':id/download')
  @RequirePermission(PERMISSIONS.DOCUMENT_VIEW)
  @ApiOperation({
    summary: 'Request presigned direct download URL (S1 / S2)',
    description:
      'Returns a short-lived presigned GET URL for the specified version (default: latest). API never proxies bytes.',
  })
  @ApiResponse({ status: 200, type: PresignDownloadResponseDto })
  async getDownloadUrl(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version') version?: string,
  ): Promise<PresignDownloadResponseDto> {
    const userPermissions = this.cls.get<string[]>('permissions') ?? [];
    const verNumber = version ? parseInt(version, 10) : undefined;
    return this.documentsService.getDownloadUrl(companyId, userPermissions, id, verNumber);
  }

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(PERMISSIONS.DOCUMENT_CREATE)
  @ApiOperation({
    summary: 'Add a new version to an existing document (S2)',
    description:
      'Increments version and creates new immutable version entry. Never overwrites older versions.',
  })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  async createVersion(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVersionDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.createVersion(companyId, userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(PERMISSIONS.DOCUMENT_DELETE)
  @ApiOperation({
    summary: 'Soft-delete / archive document',
  })
  async delete(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.documentsService.softDelete(companyId, userId, id);
  }
}
