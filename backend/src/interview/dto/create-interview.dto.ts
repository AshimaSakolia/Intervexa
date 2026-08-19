import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Number)
  resumeId?: number;

  @IsOptional()
  @IsString()
  @MinLength(50, { message: 'Resume text should be at least 50 characters' })
  resumeText?: string;

  @IsString()
  @MinLength(1, { message: 'Enter a target role' })
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
