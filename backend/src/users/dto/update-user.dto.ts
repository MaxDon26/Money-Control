import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Иван Петров',
    description: 'Имя пользователя',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'RUB', description: 'Валюта по умолчанию' })
  @IsOptional()
  @IsIn(['RUB', 'USD', 'EUR'], {
    message: 'Валюта должна быть RUB, USD или EUR',
  })
  defaultCurrency?: string;
}
