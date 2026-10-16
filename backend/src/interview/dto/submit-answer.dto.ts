import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  questionId: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1, { message: 'Enter an answer before submitting' })
  @MaxLength(10_000, { message: 'Answer is too long (max 10,000 characters)' })
  text: string;
}
