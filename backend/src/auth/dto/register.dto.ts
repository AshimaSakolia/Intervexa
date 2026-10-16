import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { MaxBytes, NormalizeEmail, Trim } from '../../common/transforms';

export class RegisterDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(72, {
    message: 'Password must be at most 72 characters',
  })
  @MaxBytes(72, { message: 'Password must be at most 72 bytes long' })
  password: string;

  @Trim()
  @IsString()
  @MinLength(1, { message: 'Enter your name' })
  @MaxLength(100)
  name: string;
}
