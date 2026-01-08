---
sidebar_position: 2
---

# Разработка Backend

## Создание нового модуля

### 1. Генерация через CLI

```bash
nest generate module examples
nest generate controller examples
nest generate service examples
```

### 2. Структура модуля

```
src/examples/
├── examples.module.ts
├── examples.controller.ts
├── examples.service.ts
└── dto/
    ├── create-example.dto.ts
    └── update-example.dto.ts
```

## DTO с валидацией

```typescript
// dto/create-example.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExampleDto {
  @ApiProperty({ description: 'Название', example: 'Пример' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Описание' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Сумма', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;
}
```

```typescript
// dto/update-example.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateExampleDto } from './create-example.dto';

export class UpdateExampleDto extends PartialType(CreateExampleDto) {}
```

## Controller

```typescript
// examples.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ExamplesService } from './examples.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';

@ApiTags('examples')
@ApiBearerAuth()
@Controller('examples')
@UseGuards(JwtAuthGuard)
export class ExamplesController {
  constructor(private readonly examplesService: ExamplesService) {}

  @Get()
  @ApiOperation({ summary: 'Получить все примеры' })
  findAll(@CurrentUser() user: User) {
    return this.examplesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить пример по ID' })
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.examplesService.findOne(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать пример' })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateExampleDto,
  ) {
    return this.examplesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить пример' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExampleDto,
  ) {
    return this.examplesService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить пример' })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.examplesService.remove(user.id, id);
  }
}
```

## Service

```typescript
// examples.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { UpdateExampleDto } from './dto/update-example.dto';

@Injectable()
export class ExamplesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.example.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const example = await this.prisma.example.findFirst({
      where: { id, userId },
    });

    if (!example) {
      throw new NotFoundException('Не найдено');
    }

    return example;
  }

  async create(userId: string, dto: CreateExampleDto) {
    return this.prisma.example.create({
      data: { ...dto, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateExampleDto) {
    await this.findOne(userId, id); // Проверка существования

    return this.prisma.example.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // Проверка существования

    return this.prisma.example.delete({
      where: { id },
    });
  }
}
```

## Регистрация модуля

```typescript
// app.module.ts
import { ExamplesModule } from './examples/examples.module';

@Module({
  imports: [
    // ... другие модули
    ExamplesModule,
  ],
})
export class AppModule {}
```

## Тестирование

```typescript
// examples.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ExamplesService } from './examples.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('ExamplesService', () => {
  let service: ExamplesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamplesService,
        {
          provide: PrismaService,
          useValue: {
            example: {
              findMany: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ExamplesService>(ExamplesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```
