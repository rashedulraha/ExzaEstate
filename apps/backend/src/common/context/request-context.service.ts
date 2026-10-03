import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export interface RequestContextData {
  companyId?: string;
  userId?: string;
  branchIds?: string[];
  requestId?: string;
  userRoles?: string[];
  permissions?: string[];
  scopes?: Record<string, string>;
}

@Injectable()
export class RequestContext {
  constructor(private readonly cls: ClsService) {}

  get companyId(): string {
    const id = this.cls.get<string | undefined>('companyId');
    if (!id) {
      throw new ForbiddenException('Tenant context missing or unauthenticated');
    }
    return id;
  }

  get optionalCompanyId(): string | undefined {
    return this.cls.get<string | undefined>('companyId');
  }

  get hasCompanyId(): boolean {
    return Boolean(this.cls.get<string | undefined>('companyId'));
  }

  get userId(): string | undefined {
    return this.cls.get<string | undefined>('userId');
  }

  get branchIds(): string[] {
    return this.cls.get<string[] | undefined>('branchIds') ?? [];
  }

  get requestId(): string | undefined {
    return this.cls.get<string | undefined>('requestId');
  }

  get userRoles(): string[] {
    return this.cls.get<string[] | undefined>('userRoles') ?? [];
  }

  get permissions(): string[] {
    return this.cls.get<string[] | undefined>('permissions') ?? [];
  }

  scopeFor(permission: string): string | undefined {
    const scopes = this.cls.get<Record<string, string> | undefined>('scopes');
    return scopes?.[permission];
  }
}
