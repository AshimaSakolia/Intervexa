import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email: string;

  @IsString({ message: 'Enter your password' })
  password: string;
}
