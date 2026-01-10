import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsDateString,
  Matches,
} from 'class-validator';
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

  @ApiPropertyOptional({
    example: '2200700000008823',
    description: 'Номер карты (16 цифр)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{16}$/, { message: 'Номер карты должен содержать 16 цифр' })
  cardNumber?: string;

  @ApiPropertyOptional({
    example: '2027-12-01',
    description: 'Срок действия карты',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({
    example: '40817810100096040360',
    description: 'Номер лицевого счёта (20 цифр)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{20}$/, { message: 'Номер счёта должен содержать 20 цифр' })
  accountNumber?: string;

  @ApiPropertyOptional({
    example: 'Тинькофф',
    description: 'Название банка',
  })
  @IsString()
  @IsOptional()
  bankName?: string;
}
