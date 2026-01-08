import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @ApiProperty({ example: 'Основная карта' })
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType, example: 'CARD' })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({ example: 'RUB', default: 'RUB' })
  @IsString()
  @IsOptional()
  currency?: string = 'RUB';

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0)
  balance: number;

  @ApiPropertyOptional({ example: 'wallet' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ example: '#1890ff' })
  @IsString()
  @IsOptional()
  color?: string;
}
