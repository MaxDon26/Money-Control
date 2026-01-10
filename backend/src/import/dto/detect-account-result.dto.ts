import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DetectAccountResultDto {
  @ApiProperty({ description: 'Название банка' })
  bankName: string;

  @ApiPropertyOptional({ description: 'Номер лицевого счёта (20 цифр)' })
  accountNumber: string | null;

  @ApiPropertyOptional({
    description: 'ID найденного счёта (если есть совпадение)',
  })
  matchedAccountId: string | null;

  @ApiPropertyOptional({ description: 'Название найденного счёта' })
  matchedAccountName: string | null;
}
