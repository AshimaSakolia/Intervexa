import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsUrl,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL: string;

  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  JWT_SECRET: string;

  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsNotEmpty({ message: 'GEMINI_API_KEY is required' })
  GEMINI_API_KEY: string;

  @IsOptional()
  @IsNumberString({}, { message: 'PORT must be a number' })
  PORT?: string;

  @IsNotEmpty({ message: 'FRONTEND_URL is required' })
  @IsUrl(
    { require_tld: false },
    { message: 'FRONTEND_URL must be a valid URL' },
  )
  FRONTEND_URL: string;

  @IsOptional()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Invalid environment configuration: ${messages}`);
  }

  if (validatedConfig.JWT_SECRET === 'change-me-to-a-long-random-string') {
    throw new Error(
      'JWT_SECRET is still set to the placeholder value. Set a real random secret before starting the app.',
    );
  }

  return validatedConfig;
}
