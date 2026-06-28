import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MIN_PASSWORD_LENGTH } from '../auth.constants';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  password!: string;
}
