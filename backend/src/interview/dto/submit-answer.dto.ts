import { IsInt, IsString, MinLength } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt()
  questionId: number;

  @IsString()
  @MinLength(1, { message: 'Enter an answer before submitting' })
  text: string;
}
