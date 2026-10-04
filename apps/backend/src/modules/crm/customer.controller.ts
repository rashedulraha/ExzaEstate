import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';
import { type DataScope, PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CustomerService } from './customer.service.js';
import { CustomerQueryService } from './customer-query.service.js';
import { CustomerRelationService } from './customer-relation.service.js';
import { CustomerTimelineService } from './customer-timeline.service.js';
import type { CustomerScopeContext } from './customer-scope.helper.js';
import {
  AttachCustomerDocumentDto,
  CreateCustomerAddressDto,
  CreateCustomerCoBuyerDto,
  CreateCustomerContactDto,
  CreateCustomerDto,
  CreateCustomerNomineeDto,
  QueryCustomersDto,
  UpdateCustomerDto,
  VerifyKycDto,
} from './dto/index.js';

@ApiTags('CRM - Customers')
@ApiBearerAuth()
@Controller('crm/customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly customerQueryService: CustomerQueryService,
    private readonly customerRelationService: CustomerRelationService,
    private readonly customerTimelineService: CustomerTimelineService,
    private readonly clsService: ClsService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.CUSTOMER_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new customer with optional addresses, contacts, nominees, co-buyers',
  })
  async createCustomer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customerService.createCustomer(companyId, dto, userId);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CUSTOMER_VIEW)
  @ApiOperation({
    summary: 'List customers with scope enforcement, filters, blind index search, and pagination',
  })
  async listCustomers(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryCustomersDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_VIEW, userId);
    const hasPii = this.hasPiiPermission();
    return this.customerQueryService.listCustomers(companyId, query, context, hasPii);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.CUSTOMER_VIEW)
  @ApiOperation({
    summary: 'Get Customer 360 profile with unmasked PII if permitted, otherwise masked',
  })
  async getCustomerById(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_VIEW, userId);
    const hasPii = this.hasPiiPermission();
    return this.customerQueryService.getCustomerById(companyId, id, context, hasPii, userId);
  }

  @Get(':id/timeline')
  @RequirePermission(PERMISSIONS.CUSTOMER_VIEW)
  @ApiOperation({
    summary:
      'Get unified customer activity timeline (leads, follow-ups, documents, status changes, KYC)',
  })
  async getCustomerTimeline(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_VIEW, userId);
    return this.customerTimelineService.getCustomerTimeline(companyId, id, context);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @ApiOperation({ summary: 'Update customer details' })
  async updateCustomer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerService.updateCustomer(companyId, id, dto, context, userId);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.CUSTOMER_DELETE)
  @ApiOperation({ summary: 'Soft delete a customer' })
  async deleteCustomer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_DELETE, userId);
    return this.customerService.deleteCustomer(companyId, id, context, userId);
  }

  @Post(':id/contacts')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a secondary contact to a customer' })
  async addContact(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerContactDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.addContact(companyId, id, dto, context);
  }

  @Delete(':id/contacts/:contactId')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @ApiOperation({ summary: 'Remove a contact from a customer' })
  async deleteContact(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('contactId') contactId: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.deleteContact(companyId, id, contactId, context);
  }

  @Post(':id/addresses')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an address to a customer' })
  async addAddress(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.addAddress(companyId, id, dto, context);
  }

  @Delete(':id/addresses/:addressId')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @ApiOperation({ summary: 'Remove an address from a customer' })
  async deleteAddress(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.deleteAddress(companyId, id, addressId, context);
  }

  @Post(':id/nominees')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a nominee with encrypted NID to a customer' })
  async addNominee(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerNomineeDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.addNominee(companyId, id, dto, context);
  }

  @Delete(':id/nominees/:nomineeId')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @ApiOperation({ summary: 'Remove a nominee from a customer' })
  async deleteNominee(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('nomineeId') nomineeId: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.deleteNominee(companyId, id, nomineeId, context);
  }

  @Post(':id/co-buyers')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a co-buyer / joint buyer to a customer' })
  async addCoBuyer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateCustomerCoBuyerDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.addCoBuyer(companyId, id, dto, context);
  }

  @Delete(':id/co-buyers/:coBuyerId')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @ApiOperation({ summary: 'Remove a co-buyer from a customer' })
  async deleteCoBuyer(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('coBuyerId') coBuyerId: string,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerRelationService.deleteCoBuyer(companyId, id, coBuyerId, context);
  }

  @Post(':id/kyc-verify')
  @RequirePermission(PERMISSIONS.CUSTOMER_VERIFY_KYC)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate KYC completeness and mark customer as KYC verified' })
  async verifyKyc(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: VerifyKycDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_VERIFY_KYC, userId);
    return this.customerService.verifyKyc(companyId, id, dto, context, userId);
  }

  @Post(':id/documents')
  @RequirePermission(PERMISSIONS.CUSTOMER_EDIT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Attach a document record to a customer' })
  async attachDocument(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AttachCustomerDocumentDto,
  ) {
    const context = this.getScopeContext(PERMISSIONS.CUSTOMER_EDIT, userId);
    return this.customerService.attachDocument(companyId, id, dto, context, userId);
  }

  private getScopeContext(permission: string, userId: string): CustomerScopeContext {
    const scopes = this.clsService.get<Record<string, DataScope> | undefined>('scopes');
    const scope = scopes?.[permission] ?? scopes?.[PERMISSIONS.CUSTOMER_VIEW] ?? 'OWN';
    const branchIds = this.clsService.get<string[] | undefined>('branchIds') ?? [];
    const teamUserIds = this.clsService.get<string[] | undefined>('teamUserIds') ?? [];
    return { userId, scope, branchIds, teamUserIds };
  }

  private hasPiiPermission(): boolean {
    const permissions = this.clsService.get<string[] | undefined>('permissions') ?? [];
    return permissions.includes(PERMISSIONS.CUSTOMER_VIEW_PII);
  }
}
