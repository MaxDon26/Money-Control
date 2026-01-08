import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number;
}
