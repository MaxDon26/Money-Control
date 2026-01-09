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
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { JwtAuthGuard } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { CategoryType } from '@prisma/client';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Создать категорию' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все категории' })
  @ApiQuery({ name: 'type', enum: CategoryType, required: false })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('type') type?: CategoryType,
  ) {
    return this.categoriesService.findAll(userId, type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить категорию по ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.categoriesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить категорию' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить категорию' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.categoriesService.remove(userId, id);
  }
}
