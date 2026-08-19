import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { InterviewService } from './interview.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

const AI_CALL_THROTTLE = { default: { limit: 6, ttl: 60_000 } };

@UseGuards(JwtAuthGuard)
@Controller('interviews')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post()
  @Throttle(AI_CALL_THROTTLE)
  create(
    @CurrentUser() user: { userId: number },
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviewService.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { userId: number }) {
    return this.interviewService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.interviewService.findOne(user.userId, id);
  }

  @Post(':id/answers')
  @Throttle(AI_CALL_THROTTLE)
  submitAnswer(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.interviewService.submitAnswer(user.userId, id, dto);
  }

  @Post(':id/complete')
  @Throttle(AI_CALL_THROTTLE)
  complete(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.interviewService.completeInterview(user.userId, id);
  }
}
