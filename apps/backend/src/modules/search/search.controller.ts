import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@exzaestate/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../../common/decorators/current-user.decorator.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchService } from './search.service.js';
import type { GlobalSearchResponseDto, SearchEntityType } from './search.types.js';

@Controller('search')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SEARCH_VIEW)
  async globalSearch(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: SearchQueryDto,
  ): Promise<GlobalSearchResponseDto> {
    const userCtx = await this.searchService.resolveUserContext(user.companyId, user.userId);

    const requestedEntities = queryDto.entities
      ? (queryDto.entities
          .split(',')
          .map((e) => e.trim().toUpperCase())
          .filter(Boolean) as SearchEntityType[])
      : undefined;

    return this.searchService.search(
      user.companyId,
      queryDto.q,
      userCtx,
      requestedEntities,
      queryDto.limit,
    );
  }
}
