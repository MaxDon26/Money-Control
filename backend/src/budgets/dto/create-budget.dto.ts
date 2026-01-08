import {
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class CreateBudgetDto {
  @ValidateIf((o) => !o.isTotal)
  @IsUUID()
  @IsNotEmpty()
  categoryId?: string;

  @IsNumber()
  @Min(1, { message: 'Сумма должна быть больше 0' })
  amount: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  @Min(2020)
  @Max(2100)
  year: number;

  @IsOptional()
  @IsBoolean()
  isTotal?: boolean;
}
