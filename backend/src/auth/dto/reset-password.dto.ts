import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Токен сброса пароля' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', description: 'Новый пароль' })
  @IsString()
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;
}
