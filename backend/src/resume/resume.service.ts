import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';

const MIN_RESUME_TEXT_LENGTH = 50;

@Injectable()
export class ResumeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async uploadAndAnalyze(userId: number, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    const rawText = await this.extractText(file.buffer);
    if (rawText.trim().length < MIN_RESUME_TEXT_LENGTH) {
      throw new BadRequestException(
        'Could not extract enough text from the PDF. Please upload a text-based resume PDF.',
      );
    }

    const analysis = await this.gemini.analyzeResume(rawText);

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        fileName: file.originalname,
        rawText,
        analysis: JSON.stringify(analysis),
      },
    });

    if (analysis.claims?.length) {
      await this.prisma.resumeClaim.createMany({
        data: analysis.claims.map((claim) => ({
          resumeId: resume.id,
          text: claim.text,
          category: claim.category,
        })),
      });
    }

    return this.findOne(userId, resume.id);
  }

  async findAllForUser(userId: number) {
    return this.prisma.resume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { claims: true },
    });
  }

  async findOne(userId: number, resumeId: number) {
    const resume = await this.prisma.resume.findUnique({
      where: { id: resumeId },
      include: { claims: true },
    });

    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId !== userId) throw new ForbiddenException();

    return resume;
  }

  private async extractText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } catch {
      throw new BadRequestException(
        'Failed to parse PDF file. It may be corrupted or password-protected.',
      );
    } finally {
      await parser.destroy();
    }
  }
}
