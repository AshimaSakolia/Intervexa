import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface DetailedEvaluationResult {
  technicalCorrectness: number;
  technicalDepth: number;
  problemSolving: number;
  communication: number;
  resumeUnderstanding: number;
  overallScore: number;
  feedback: string;
  performanceLabel: 'STRONG' | 'WEAK' | 'INCORRECT' | 'INTERESTING' | 'AVERAGE';
}

export interface AdvancedReportResult {
  overallScore: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  categoryScores: {
    technicalCorrectness: number;
    technicalDepth: number;
    problemSolving: number;
    communication: number;
    resumeUnderstanding: number;
  };
  missedConcepts: string[];
  resumeClaimConfidence: { claim: string; confidence: number; notes: string }[];
  motivation: string;
}

export interface ResumeAnalysis {
  skills: string[];
  technologies: string[];
  projects: string[];
  experience: string[];
  claims: { text: string; category: string }[];
}

export interface NextQuestionResult {
  question: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  askedBecause: string;
  targetsClaimText?: string;
}

export interface LearningPlanResult {
  topics: { topic: string; subtopics: string[]; practiceQuestions: string[] }[];
  recommendedNextInterview: string;
}

const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly model = 'gemini-3.5-flash-lite';

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }

  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    const prompt = `You are a resume analyst. Analyze the resume below and extract structured information.

Resume:
"""
${resumeText}
"""

Identify:
- skills: general skills (e.g. "Problem Solving", "System Design")
- technologies: specific tools/languages/frameworks (e.g. "NestJS", "MySQL")
- projects: named projects or products mentioned
- experience: notable roles/responsibilities as short phrases
- claims: the most important, specific, and checkable claims the candidate makes about what they built or did (e.g. "Built RabbitMQ-based asynchronous workflows for background job processing"). Include 5-8 claims. Each claim needs a category: one of "technical", "project", "experience", "leadership".

Respond with ONLY JSON in this exact shape, no markdown:
{"skills": ["string"], "technologies": ["string"], "projects": ["string"], "experience": ["string"], "claims": [{"text": "string", "category": "string"}]}`;

    return this.generateJson<ResumeAnalysis>(prompt);
  }

  async generateNextQuestion(context: {
    resumeAnalysis: ResumeAnalysis | null;
    targetRole: string;
    interviewType: string;
    difficulty: string;
    history: {
      question: string;
      answer: string;
      performanceLabel: string | null;
    }[];
    unprobedClaims: { id: number; text: string }[];
    questionNumber: number;
    maxQuestions: number;
  }): Promise<NextQuestionResult> {
    const historyBlock = context.history.length
      ? context.history
          .map(
            (h, i) =>
              `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}\nPerformance: ${h.performanceLabel ?? 'UNKNOWN'}`,
          )
          .join('\n\n')
      : 'No questions asked yet — this is the first question.';

    const claimsBlock = context.unprobedClaims.length
      ? context.unprobedClaims.map((c) => `- [${c.id}] ${c.text}`).join('\n')
      : 'None remaining.';

    const lastPerformance = context.history.at(-1)?.performanceLabel;

    const adaptiveInstruction = lastPerformance
      ? ({
          STRONG:
            'The candidate answered the previous question very well. Ask a harder, deeper follow-up on the same or a related topic.',
          WEAK: 'The candidate struggled with the previous question. Ask a clarifying or easier question on the same topic to check understanding at a more basic level.',
          INCORRECT:
            'The candidate got the previous answer wrong. Ask a question that tests the underlying concept more directly, at a simpler level.',
          INTERESTING:
            'The candidate gave an interesting or unusual answer. Ask a natural follow-up question that digs into that specific detail.',
          AVERAGE:
            'The candidate gave an adequate answer. Move to a new topic of similar difficulty.',
        }[lastPerformance] ??
        "Continue the interview naturally based on the candidate's previous answer.")
      : 'This is the first question — pick a strong opening question based on the resume and role.';

    const prompt = `You are conducting an adaptive, one-question-at-a-time mock interview.

Target role: ${context.targetRole}
Interview type: ${context.interviewType}
Base difficulty: ${context.difficulty}
Question ${context.questionNumber} of ${context.maxQuestions}.

Candidate resume analysis:
${JSON.stringify(context.resumeAnalysis)}

Conversation so far:
${historyBlock}

Resume claims not yet probed (pick one occasionally to verify the candidate actually understands what they claimed, without accusing them of lying — just ask them to explain it):
${claimsBlock}

Adaptive instruction: ${adaptiveInstruction}

Rules:
- Do NOT repeat a question or topic already covered above.
- Keep the question focused and answerable in a few sentences.
- Match the interview type "${context.interviewType}" (e.g. HR/behavioral questions for HR type, architecture questions for System Design, etc).
- If you use one of the unprobed resume claims as the basis for this question, include its exact text in "targetsClaimText"; otherwise omit that field.

Respond with ONLY JSON in this exact shape, no markdown:
{"question": "string", "topic": "string", "difficulty": "EASY"|"MEDIUM"|"HARD", "askedBecause": "string (1 sentence explaining why this question was chosen given the adaptive instruction)", "targetsClaimText": "string (optional)"}`;

    return this.generateJson<NextQuestionResult>(prompt);
  }

  async evaluateAnswerDetailed(context: {
    question: string;
    answer: string;
    targetRole: string;
    isClaimVerification: boolean;
    claimText?: string;
  }): Promise<DetailedEvaluationResult> {
    const claimInstruction = context.isClaimVerification
      ? `This question was asked to verify the candidate's understanding of a specific resume claim: "${context.claimText}". Evaluate whether their explanation demonstrates genuine understanding of what they claimed to have done. Do not accuse them of lying — simply assess the depth and accuracy of their explanation and reflect that in "resumeUnderstanding".`
      : `Rate "resumeUnderstanding" based on how well the answer reflects genuine hands-on experience relevant to their background (0-100; use 50 as a neutral default if not clearly assessable from this answer alone).`;

    const prompt = `You are an expert interviewer evaluating one answer during a mock interview for the role "${context.targetRole}".

Question: ${context.question}
Answer: ${context.answer}

${claimInstruction}

Score each category from 0-100:
- technicalCorrectness: is the answer factually/technically correct?
- technicalDepth: does it show depth beyond a surface-level answer?
- problemSolving: does it demonstrate structured reasoning/problem-solving?
- communication: is the answer clear and well-organized?
- resumeUnderstanding: as instructed above.

Also compute overallScore (0-100, weighted average reflecting overall quality) and a short feedback (2-3 sentences, constructive, specific).

Finally, classify the answer's performanceLabel as exactly one of:
- "STRONG" (clearly correct and deep)
- "WEAK" (partially correct but shallow or unclear)
- "INCORRECT" (factually wrong or misses the point)
- "INTERESTING" (correct but includes an unusual or unexpected angle worth following up on)
- "AVERAGE" (adequate, nothing notable)

Respond with ONLY JSON in this exact shape, no markdown:
{"technicalCorrectness": number, "technicalDepth": number, "problemSolving": number, "communication": number, "resumeUnderstanding": number, "overallScore": number, "feedback": "string", "performanceLabel": "STRONG"|"WEAK"|"INCORRECT"|"INTERESTING"|"AVERAGE"}`;

    return this.generateJson<DetailedEvaluationResult>(prompt);
  }

  async generateAdvancedReport(context: {
    targetRole: string;
    interviewType: string;
    qa: {
      question: string;
      answer: string;
      technicalCorrectness: number;
      technicalDepth: number;
      problemSolving: number;
      communication: number;
      resumeUnderstanding: number;
      feedback: string;
      targetsClaimText?: string;
    }[];
  }): Promise<AdvancedReportResult> {
    const transcript = context.qa
      .map(
        (item, i) =>
          `Q${i + 1}: ${item.question}\nA${i + 1}: ${item.answer}\n` +
          `Scores -> correctness:${item.technicalCorrectness} depth:${item.technicalDepth} problemSolving:${item.problemSolving} communication:${item.communication} resumeUnderstanding:${item.resumeUnderstanding}` +
          (item.targetsClaimText
            ? `\nProbed resume claim: "${item.targetsClaimText}"`
            : ''),
      )
      .join('\n\n');

    const prompt = `You are producing a final evaluation report for a ${context.interviewType} mock interview for the role "${context.targetRole}".

Full transcript with per-answer category scores:
${transcript}

Produce:
- overallScore (0-100)
- categoryScores: average of each category across all answers (0-100 each)
- summary (2-4 sentences)
- strengths (2-4 sentences)
- weaknesses (2-4 sentences)
- missedConcepts: array of specific concepts/topics the candidate should have covered but didn't or got wrong
- resumeClaimConfidence: for every question that probed a resume claim, output {"claim": the claim text, "confidence": 0-100 how well the candidate demonstrated real understanding of that claim, "notes": short justification}. If no claims were probed, return an empty array.
- motivation: one short, genuine closing note (1-2 sentences) for the candidate, calibrated to their actual performance. If the score is strong, be encouraging and specific about what they should keep doing. If it's mixed or weak, be honest but constructive and forward-looking — never generic filler, never patronizing, and never mention the numeric score directly.

Respond with ONLY JSON in this exact shape, no markdown:
{"overallScore": number, "categoryScores": {"technicalCorrectness": number, "technicalDepth": number, "problemSolving": number, "communication": number, "resumeUnderstanding": number}, "summary": "string", "strengths": "string", "weaknesses": "string", "missedConcepts": ["string"], "resumeClaimConfidence": [{"claim": "string", "confidence": number, "notes": "string"}], "motivation": "string"}`;

    return this.generateJson<AdvancedReportResult>(prompt);
  }

  async generateLearningPlan(context: {
    targetRole: string;
    weaknesses: string;
    missedConcepts: string[];
  }): Promise<LearningPlanResult> {
    const prompt = `You are a technical mentor creating a personalized study plan for someone preparing for a "${context.targetRole}" role, based on their mock interview weaknesses.

Weaknesses: ${context.weaknesses}
Missed concepts: ${context.missedConcepts.join(', ') || 'none specifically identified'}

Produce 2-5 topics to study. For each topic include 2-4 subtopics and 2-3 practice questions the candidate could self-test with. Also recommend what kind of interview (type + difficulty + focus area) they should attempt next and why.

Respond with ONLY JSON in this exact shape, no markdown:
{"topics": [{"topic": "string", "subtopics": ["string"], "practiceQuestions": ["string"]}], "recommendedNextInterview": "string"}`;

    return this.generateJson<LearningPlanResult>(prompt);
  }

  private async generateJson<T>(prompt: string): Promise<T> {
    const model = this.client.getGenerativeModel({ model: this.model });

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return this.parseJsonObject<T>(text);
      } catch (error) {
        lastError = error;
        const status = this.extractStatusCode(error);

        if (
          status &&
          RETRYABLE_STATUS_CODES.has(status) &&
          attempt < MAX_RETRIES
        ) {
          const delay = BASE_RETRY_DELAY_MS * 2 ** attempt;
          this.logger.warn(
            `Gemini request failed with status ${status}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          await this.sleep(delay);
          continue;
        }

        if (error instanceof SyntaxError && attempt < MAX_RETRIES) {
          this.logger.warn(
            `Gemini returned malformed JSON, retrying (attempt ${attempt + 1}/${MAX_RETRIES})`,
          );
          continue;
        }

        break;
      }
    }

    this.logger.error(
      `Gemini request failed after retries: ${String(lastError)}`,
    );
    throw new ServiceUnavailableException(
      'The AI service is temporarily unavailable. Please try again in a moment.',
    );
  }

  private extractStatusCode(error: unknown): number | undefined {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = error.status;
      return typeof status === 'number' ? status : undefined;
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseJsonObject<T>(text: string): T {
    const cleaned = this.stripCodeFences(text);
    return JSON.parse(cleaned) as T;
  }

  private stripCodeFences(text: string): string {
    return text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
  }
}
