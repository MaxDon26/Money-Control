import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ParseRequisitesResultDto {
  @ApiProperty({ example: 'Тинькофф' })
  bankName: string;

  @ApiProperty({ example: 'Тинькофф •8823' })
  suggestedName: string;

  @ApiProperty({ example: '8823' })
  cardLastFour: string;

  @ApiPropertyOptional({ example: '40817810100000000001' })
  accountNumber: string;

  @ApiProperty({ example: 'RUB' })
  currency: string;

  @ApiPropertyOptional({ example: 'Иванов Иван Иванович' })
  ownerName: string;
}
