import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @IsString({ message: 'Enter your password' })
  @MaxLength(72)
  password: string;
}
