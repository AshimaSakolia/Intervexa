import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ResumeService } from './resume.service';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('resumes')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  upload(
    @CurrentUser() user: { userId: number },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.resumeService.uploadAndAnalyze(user.userId, file);
  }

  @Get()
  findAll(@CurrentUser() user: { userId: number }) {
    return this.resumeService.findAllForUser(user.userId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.resumeService.findOne(user.userId, id);
  }
}
