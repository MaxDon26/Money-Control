import { ApiProperty } from '@nestjs/swagger';

export class ImportResultDto {
  @ApiProperty({ description: 'Количество импортированных транзакций' })
  imported: number;

  @ApiProperty({ description: 'Количество пропущенных дубликатов' })
  skipped: number;

  @ApiProperty({ description: 'Название банка' })
  bankName: string;

  @ApiProperty({ description: 'Детали категоризации', required: false })
  categorization?: {
    byKeywords: number;
    byAi: number;
    byDefault: number;
  };
}
