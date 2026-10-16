import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DetailedEvaluationResult,
  GeminiService,
  ResumeAnalysis,
} from '../gemini/gemini.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

const VALID_DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

@Injectable()
export class InterviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async create(userId: number, dto: CreateInterviewDto) {
    let resumeText = dto.resumeText;
    const resumeId: number | undefined = dto.resumeId;

    if (dto.resumeId) {
      const resume = await this.prisma.resume.findUnique({
        where: { id: dto.resumeId },
      });
      if (!resume) throw new NotFoundException('Resume not found');
      if (resume.userId !== userId) throw new ForbiddenException();
      resumeText = resume.rawText;
    }

    if (!resumeText) {
      throw new BadRequestException(
        'Either resumeId or resumeText must be provided',
      );
    }

    const roleValidation = await this.gemini.validateTargetRole(dto.targetRole);
    if (!roleValidation.isValidRole) {
      throw new BadRequestException(
        roleValidation.reason
          ? `"${dto.targetRole}" doesn't look like a valid target role: ${roleValidation.reason}`
          : `"${dto.targetRole}" doesn't look like a valid target role.`,
      );
    }

    const interview = await this.prisma.interview.create({
      data: {
        userId,
        resumeId,
        resumeText,
        targetRole: dto.targetRole,
        interviewType: dto.interviewType,
        difficulty: dto.difficulty,
        maxQuestions: dto.maxQuestions ?? 5,
        status: 'IN_PROGRESS',
      },
    });

    try {
      await this.generateAndStoreNextQuestion(interview.id);
    } catch (error) {
      // Don't leave an interview with no questions behind when the AI fails.
      await this.prisma.interview
        .delete({ where: { id: interview.id } })
        .catch(() => undefined);
      throw error;
    }

    return this.findOne(userId, interview.id);
  }

  async findOne(userId: number, interviewId: number) {
    const interview = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        questions: {
          include: { answer: true, targetsClaim: true },
          orderBy: { order: 'asc' },
        },
        report: true,
        learningPlan: true,
        resume: true,
      },
    });

    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.userId !== userId) throw new ForbiddenException();

    return interview;
  }

  async findAllForUser(userId: number) {
    return this.prisma.interview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      omit: { resumeText: true },
      include: { questions: true, report: true },
    });
  }

  /**
   * Returns the question awaiting an answer, generating it if the previous
   * generation failed. Safe to call repeatedly.
   */
  async ensureNextQuestion(userId: number, interviewId: number) {
    const interview = await this.findOne(userId, interviewId);

    if (interview.status === 'COMPLETED') {
      throw new BadRequestException('This interview is already completed');
    }

    const pending = interview.questions.find((q) => !q.answer);
    if (pending) return pending;

    if (interview.questions.length >= interview.maxQuestions) {
      throw new BadRequestException(
        'All questions have been answered. Complete the interview to get your report.',
      );
    }

    return this.generateAndStoreNextQuestion(interviewId);
  }

  async submitAnswer(
    userId: number,
    interviewId: number,
    dto: SubmitAnswerDto,
  ) {
    const interview = await this.findOne(userId, interviewId);

    if (interview.status === 'COMPLETED') {
      throw new BadRequestException('This interview is already completed');
    }

    const question = interview.questions.find((q) => q.id === dto.questionId);
    if (!question)
      throw new NotFoundException('Question not found on this interview');
    if (question.answer)
      throw new BadRequestException('This question has already been answered');

    const evaluation = await this.gemini.evaluateAnswerDetailed({
      question: question.text,
      answer: dto.text,
      targetRole: interview.targetRole,
      isClaimVerification: Boolean(question.targetsClaimId),
      claimText: question.targetsClaim?.text,
    });

    const answer = await this.createAnswer(
      dto.questionId,
      dto.text,
      evaluation,
    );

    if (question.targetsClaimId) {
      await this.prisma.resumeClaim.update({
        where: { id: question.targetsClaimId },
        data: {
          confidence: evaluation.resumeUnderstanding,
          notes: evaluation.feedback,
        },
      });
    }

    const answeredCount =
      interview.questions.filter((q) => q.answer).length + 1;
    const hasNextQuestion = answeredCount < interview.maxQuestions;

    // The answer is already saved; if the AI can't produce the next question
    // right now, report that instead of failing so the client can retry via
    // POST /interviews/:id/next-question.
    let nextQuestion: Awaited<
      ReturnType<typeof this.generateAndStoreNextQuestion>
    > | null = null;
    let nextQuestionFailed = false;
    if (hasNextQuestion) {
      try {
        nextQuestion = await this.generateAndStoreNextQuestion(interviewId);
      } catch {
        nextQuestionFailed = true;
      }
    }

    return {
      answer,
      nextQuestion,
      isLastQuestion: !hasNextQuestion,
      nextQuestionFailed,
    };
  }

  async completeInterview(userId: number, interviewId: number) {
    const interview = await this.findOne(userId, interviewId);

    if (
      interview.status === 'COMPLETED' &&
      interview.report &&
      interview.learningPlan
    ) {
      return interview.report;
    }

    const answeredQuestions = interview.questions.filter((q) => q.answer);
    if (answeredQuestions.length === 0) {
      throw new BadRequestException(
        'Answer at least one question before completing the interview',
      );
    }

    let report = interview.report;
    let reportWeaknesses = report?.weaknesses;
    let reportMissedConcepts: string[] | undefined = report
      ? (JSON.parse(report.missedConcepts ?? '[]') as string[])
      : undefined;

    if (!report) {
      const qa = answeredQuestions.map((q) => ({
        question: q.text,
        answer: q.answer!.text,
        technicalCorrectness: q.answer!.technicalCorrectness ?? 0,
        technicalDepth: q.answer!.technicalDepth ?? 0,
        problemSolving: q.answer!.problemSolving ?? 0,
        communication: q.answer!.communication ?? 0,
        resumeUnderstanding: q.answer!.resumeUnderstanding ?? 0,
        feedback: q.answer!.feedback ?? '',
        targetsClaimText: q.targetsClaim?.text,
      }));

      const reportResult = await this.gemini.generateAdvancedReport({
        targetRole: interview.targetRole,
        interviewType: interview.interviewType,
        qa,
      });

      try {
        report = await this.prisma.report.create({
          data: {
            interviewId,
            overallScore: reportResult.overallScore,
            summary: reportResult.summary,
            strengths: reportResult.strengths,
            weaknesses: reportResult.weaknesses,
            categoryScores: JSON.stringify(reportResult.categoryScores),
            missedConcepts: JSON.stringify(reportResult.missedConcepts),
            resumeClaimConfidence: JSON.stringify(
              reportResult.resumeClaimConfidence,
            ),
            motivation: reportResult.motivation,
          },
        });
        reportWeaknesses = reportResult.weaknesses;
        reportMissedConcepts = reportResult.missedConcepts;
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        // A concurrent request already completed this interview.
        return this.prisma.report.findUniqueOrThrow({
          where: { interviewId },
        });
      }
    }

    const learningPlanResult = await this.gemini.generateLearningPlan({
      targetRole: interview.targetRole,
      weaknesses: reportWeaknesses ?? '',
      missedConcepts: reportMissedConcepts ?? [],
    });

    try {
      await this.prisma.$transaction([
        this.prisma.learningPlan.upsert({
          where: { interviewId },
          create: {
            interviewId,
            topics: JSON.stringify(learningPlanResult.topics),
            recommendedNextInterview:
              learningPlanResult.recommendedNextInterview,
          },
          update: {
            topics: JSON.stringify(learningPlanResult.topics),
            recommendedNextInterview:
              learningPlanResult.recommendedNextInterview,
          },
        }),
        this.prisma.interview.update({
          where: { id: interviewId },
          data: { status: 'COMPLETED', completedAt: new Date() },
        }),
      ]);
    } catch (error) {
      // A concurrent request won the race to write the plan; that's fine.
      if (!isUniqueConstraintError(error)) throw error;
    }

    return report;
  }

  private async createAnswer(
    questionId: number,
    text: string,
    evaluation: DetailedEvaluationResult,
  ) {
    try {
      return await this.prisma.answer.create({
        data: {
          questionId,
          text,
          score: evaluation.overallScore,
          feedback: evaluation.feedback,
          technicalCorrectness: evaluation.technicalCorrectness,
          technicalDepth: evaluation.technicalDepth,
          problemSolving: evaluation.problemSolving,
          communication: evaluation.communication,
          resumeUnderstanding: evaluation.resumeUnderstanding,
          performanceLabel: evaluation.performanceLabel,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('This question has already been answered');
      }
      throw error;
    }
  }

  private async generateAndStoreNextQuestion(interviewId: number) {
    const interview = await this.prisma.interview.findUniqueOrThrow({
      where: { id: interviewId },
      include: {
        questions: {
          include: { answer: true, targetsClaim: true },
          orderBy: { order: 'asc' },
        },
        resume: { include: { claims: true } },
      },
    });

    const resumeAnalysis: ResumeAnalysis | null = interview.resume?.analysis
      ? (JSON.parse(interview.resume.analysis) as ResumeAnalysis)
      : null;

    const probedClaimIds = new Set(
      interview.questions
        .filter((q) => q.targetsClaimId)
        .map((q) => q.targetsClaimId as number),
    );
    const unprobedClaims = (interview.resume?.claims ?? [])
      .filter((c) => !probedClaimIds.has(c.id))
      .map((c) => ({ id: c.id, text: c.text }));

    const history = interview.questions
      .filter((q) => q.answer)
      .map((q) => ({
        question: q.text,
        answer: q.answer!.text,
        performanceLabel: q.answer!.performanceLabel,
      }));

    const nextQuestionNumber = interview.questions.length + 1;

    const generated = await this.gemini.generateNextQuestion({
      resumeAnalysis,
      targetRole: interview.targetRole,
      interviewType: interview.interviewType,
      difficulty: interview.difficulty,
      history,
      unprobedClaims,
      questionNumber: nextQuestionNumber,
      maxQuestions: interview.maxQuestions,
    });

    const targetsClaim = generated.targetsClaimText
      ? (interview.resume?.claims ?? []).find(
          (c) => c.text === generated.targetsClaimText,
        )
      : undefined;

    const difficulty = VALID_DIFFICULTIES.has(generated.difficulty)
      ? generated.difficulty
      : interview.difficulty;

    try {
      return await this.prisma.question.create({
        data: {
          interviewId,
          text: generated.question,
          order: nextQuestionNumber,
          topic: generated.topic,
          difficulty,
          askedBecause: generated.askedBecause,
          targetsClaimId: targetsClaim?.id,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // A concurrent request already stored this question number.
        const existing = await this.prisma.question.findUnique({
          where: {
            interviewId_order: { interviewId, order: nextQuestionNumber },
          },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
}
