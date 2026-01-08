import { PartialType } from '@nestjs/swagger';
import { CreateRecurringDto } from './create-recurring.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRecurringDto extends PartialType(CreateRecurringDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
