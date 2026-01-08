import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать бюджет' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBudgetDto) {
    return this.budgetsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все бюджеты' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.budgetsService.findAll(
      userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Get('progress')
  @ApiOperation({ summary: 'Получить прогресс по бюджетам' })
  getProgress(
    @CurrentUser('id') userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.budgetsService.getProgress(
      userId,
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post('copy-previous')
  @ApiOperation({ summary: 'Скопировать бюджеты с предыдущего месяца' })
  copyFromPrevious(
    @CurrentUser('id') userId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    return this.budgetsService.copyFromPreviousMonth(
      userId,
      parseInt(month),
      parseInt(year),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить бюджет по ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.budgetsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить бюджет' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить бюджет' })
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.budgetsService.delete(userId, id);
  }
}
