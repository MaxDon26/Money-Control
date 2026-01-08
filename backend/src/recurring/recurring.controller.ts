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
import { RecurringService } from './recurring.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Recurring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring')
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @ApiOperation({ summary: 'Создать повторяющийся платёж' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateRecurringDto) {
    return this.recurringService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все повторяющиеся платежи' })
  findAll(@CurrentUser('id') userId: string) {
    return this.recurringService.findAll(userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Получить предстоящие платежи' })
  getUpcoming(@CurrentUser('id') userId: string, @Query('days') days?: string) {
    return this.recurringService.getUpcoming(userId, days ? parseInt(days) : 7);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить платёж по ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить платёж' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.recurringService.update(userId, id, dto);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Включить/выключить платёж' })
  toggle(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringService.toggle(userId, id);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Пропустить следующий платёж' })
  skip(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringService.skip(userId, id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Выполнить платёж сейчас' })
  process(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringService.processPayment(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить платёж' })
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.recurringService.delete(userId, id);
  }
}
