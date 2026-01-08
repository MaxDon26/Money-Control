import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Общая статистика' })
  getSummary(
    @CurrentUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getSummary(
      userId,
      query.dateFrom,
      query.dateTo,
    );
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Расходы/доходы по категориям' })
  getByCategory(
    @CurrentUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getByCategory(
      userId,
      query.dateFrom,
      query.dateTo,
    );
  }

  @Get('trend')
  @ApiOperation({ summary: 'Тренд по месяцам' })
  getTrend(
    @CurrentUser('id') userId: string,
    @Query('months') months?: string,
  ) {
    return this.analyticsService.getTrend(
      userId,
      months ? parseInt(months) : 6,
    );
  }

  @Get('recent')
  @ApiOperation({ summary: 'Последние транзакции' })
  getRecent(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.analyticsService.getRecentTransactions(
      userId,
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('top-categories')
  @ApiOperation({ summary: 'Топ категорий расходов' })
  getTopCategories(
    @CurrentUser('id') userId: string,
    @Query() query: AnalyticsQueryDto,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getTopCategories(
      userId,
      limit ? parseInt(limit) : 5,
      query.dateFrom,
      query.dateTo,
    );
  }
}
