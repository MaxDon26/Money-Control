import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class ImportStatementDto {
  @ApiProperty({
    description: 'ID счёта для импорта транзакций',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Укажите счёт для импорта' })
  accountId: string;
}
