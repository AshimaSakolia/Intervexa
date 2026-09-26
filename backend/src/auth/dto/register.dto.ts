import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(72, {
    message: 'Password must be at most 72 characters',
  })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Enter your name' })
  @MaxLength(100)
  name: string;
}
