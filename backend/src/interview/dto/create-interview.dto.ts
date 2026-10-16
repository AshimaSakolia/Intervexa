import {
  IsEnum,
  MaxLength,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../common/transforms';

export enum InterviewTypeDto {
  TECHNICAL = 'TECHNICAL',
  HR = 'HR',
  BEHAVIORAL = 'BEHAVIORAL',
  PROJECT = 'PROJECT',
  SYSTEM_DESIGN = 'SYSTEM_DESIGN',
}

export enum DifficultyDto {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export class CreateInterviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  @Type(() => Number)
  resumeId?: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(30_000, {
    message: 'Resume text is too long (max 30,000 characters)',
  })
  @MinLength(50, { message: 'Resume text should be at least 50 characters' })
  resumeText?: string;

  @Trim()
  @IsString()
  @MinLength(1, { message: 'Enter a target role' })
  @MaxLength(100, { message: 'Target role is too long (max 100 characters)' })
  targetRole: string;

  @IsEnum(InterviewTypeDto, { message: 'Choose a valid interview type' })
  interviewType: InterviewTypeDto;

  @IsEnum(DifficultyDto, { message: 'Choose a valid difficulty' })
  difficulty: DifficultyDto;

  @IsOptional()
  @IsInt()
  @Min(3, { message: 'Choose at least 3 questions' })
  @Max(10, { message: 'Choose at most 10 questions' })
  @Type(() => Number)
  maxQuestions?: number;
}
