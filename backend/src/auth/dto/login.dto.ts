import { IsEmail, IsString, MaxLength } from 'class-validator';
import { NormalizeEmail } from '../../common/transforms';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;

  @IsString({ message: 'Enter your password' })
  @MaxLength(72)
  password: string;
}
