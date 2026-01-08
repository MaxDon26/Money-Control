import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';

@ApiTags('Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({ summary: 'Создать перевод между счетами' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTransferDto) {
    return this.transfersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить список переводов' })
  findAll(@CurrentUser('id') userId: string) {
    return this.transfersService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить перевод по ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.transfersService.findOne(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить перевод' })
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.transfersService.delete(userId, id);
  }
}
