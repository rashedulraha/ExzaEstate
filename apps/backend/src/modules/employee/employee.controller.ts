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
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { CreateEmployeeDto, QueryEmployeesDto, UpdateEmployeeDto } from './dto/employee.dto.js';
import { EmployeeService } from './employee.service.js';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermission(PERMISSIONS.EMPLOYEE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create employee profile' })
  async createEmployee(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeeService.createEmployee(companyId, dto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'List employees with pagination and filters' })
  async listEmployees(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryEmployeesDto,
  ) {
    return this.employeeService.listEmployees(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEE_VIEW)
  @ApiOperation({ summary: 'Get employee details by ID' })
  async getEmployeeById(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.employeeService.getEmployeeById(companyId, id);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEE_EDIT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update employee profile' })
  async updateEmployee(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeeService.updateEmployee(companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.EMPLOYEE_DELETE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete employee profile' })
  async deleteEmployee(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    await this.employeeService.deleteEmployee(companyId, id);
    return { message: 'Employee deleted successfully' };
  }
}
