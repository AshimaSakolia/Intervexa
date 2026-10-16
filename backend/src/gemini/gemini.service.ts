import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIRequestInputError,
  GoogleGenerativeAIResponseError,
} from '@google/generative-ai';

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
  isResume: boolean;
  notResumeReason: string | null;
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

const PERFORMANCE_LABELS = new Set([
  'STRONG',
  'WEAK',
  'INCORRECT',
  'INTERESTING',
  'AVERAGE',
]);
const DIFFICULTIES = new Set(['EASY', 'MEDIUM', 'HARD']);

/** Model output is untrusted: coerce to an integer in 0-100. */
function toScore(value: unknown, fallback = 0): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function toText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503, 504]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
/** Per-attempt cap so a hung call can't block the request indefinitely. */
const REQUEST_TIMEOUT_MS = 15_000;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;
  private readonly model = 'gemini-3.5-flash-lite';

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  }

  async analyzeResume(resumeText: string): Promise<ResumeAnalysis> {
    const prompt = `You are a resume analyst. First determine whether the document below is actually a resume/CV (a document describing a person's work experience, education, skills, and projects for job applications). It is NOT a resume if it is, for example, an answer sheet, exam paper, assignment, invoice, article, or any other unrelated document.

Document:
"""
${resumeText}
"""

If it IS a resume, also identify:
- skills: general skills (e.g. "Problem Solving", "System Design")
- technologies: specific tools/languages/frameworks (e.g. "NestJS", "MySQL")
- projects: named projects or products mentioned
- experience: notable roles/responsibilities as short phrases
- claims: the most important, specific, and checkable claims the candidate makes about what they built or did (e.g. "Built RabbitMQ-based asynchronous workflows for background job processing"). Include 5-8 claims. Each claim needs a category: one of "technical", "project", "experience", "leadership".

If it is NOT a resume, leave skills/technologies/projects/experience/claims as empty arrays and set notResumeReason to a short explanation of what the document actually appears to be.

Respond with ONLY JSON in this exact shape, no markdown:
{"isResume": boolean, "notResumeReason": "string or null", "skills": ["string"], "technologies": ["string"], "projects": ["string"], "experience": ["string"], "claims": [{"text": "string", "category": "string"}]}`;

    const raw = asObject(await this.generateJson<unknown>(prompt));
    const isResume = raw.isResume === true;
    const claims = Array.isArray(raw.claims)
      ? raw.claims
          .map((c) => asObject(c))
          .filter((c) => toText(c.text))
          .map((c) => ({
            text: toText(c.text),
            category: toText(c.category, 'technical'),
          }))
      : [];
    return {
      isResume,
      notResumeReason: toText(raw.notResumeReason) || null,
      skills: toStringArray(raw.skills),
      technologies: toStringArray(raw.technologies),
      projects: toStringArray(raw.projects),
      experience: toStringArray(raw.experience),
      claims: isResume ? claims : [],
    };
  }

  async validateTargetRole(
    targetRole: string,
  ): Promise<{ isValidRole: boolean; reason: string | null }> {
    const prompt = `Determine whether the text below is a plausible job title or target role someone could interview for (e.g. "Senior Backend Engineer", "Product Manager", "Data Analyst"). Reject gibberish, random characters, or text that is clearly not a job role.

Text: "${targetRole}"

Respond with ONLY JSON in this exact shape, no markdown:
{"isValidRole": boolean, "reason": "string or null, a short reason only when isValidRole is false"}`;

    const raw = asObject(await this.generateJson<unknown>(prompt));
    return {
      isValidRole: raw.isValidRole === true,
      reason: toText(raw.reason) || null,
    };
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

    const raw = asObject(await this.generateJson<unknown>(prompt));
    const question = toText(raw.question);
    if (!question) {
      this.logger.error('Gemini returned a next question without any text');
      throw new ServiceUnavailableException(
        'The AI service returned an unusable response. Please try again.',
      );
    }
    const difficulty = toText(raw.difficulty).toUpperCase();
    return {
      question,
      topic: toText(raw.topic, context.targetRole),
      difficulty: (DIFFICULTIES.has(difficulty)
        ? difficulty
        : context.difficulty) as NextQuestionResult['difficulty'],
      askedBecause: toText(raw.askedBecause),
      targetsClaimText: toText(raw.targetsClaimText) || undefined,
    };
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

    const raw = asObject(await this.generateJson<unknown>(prompt));
    const technicalCorrectness = toScore(raw.technicalCorrectness);
    const technicalDepth = toScore(raw.technicalDepth);
    const problemSolving = toScore(raw.problemSolving);
    const communication = toScore(raw.communication);
    const resumeUnderstanding = toScore(raw.resumeUnderstanding, 50);
    const overallScore = toScore(
      raw.overallScore,
      Math.round(
        (technicalCorrectness +
          technicalDepth +
          problemSolving +
          communication) /
          4,
      ),
    );
    const label = toText(raw.performanceLabel).toUpperCase();
    return {
      technicalCorrectness,
      technicalDepth,
      problemSolving,
      communication,
      resumeUnderstanding,
      overallScore,
      feedback: toText(
        raw.feedback,
        'No feedback was generated for this answer.',
      ),
      performanceLabel: (PERFORMANCE_LABELS.has(label)
        ? label
        : 'AVERAGE') as DetailedEvaluationResult['performanceLabel'],
    };
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

    const raw = asObject(await this.generateJson<unknown>(prompt));
    const categories = asObject(raw.categoryScores);
    return {
      overallScore: toScore(raw.overallScore),
      summary: toText(raw.summary, 'No summary was generated.'),
      strengths: toText(raw.strengths, 'No strengths were identified.'),
      weaknesses: toText(raw.weaknesses, 'No weaknesses were identified.'),
      categoryScores: {
        technicalCorrectness: toScore(categories.technicalCorrectness),
        technicalDepth: toScore(categories.technicalDepth),
        problemSolving: toScore(categories.problemSolving),
        communication: toScore(categories.communication),
        resumeUnderstanding: toScore(categories.resumeUnderstanding),
      },
      missedConcepts: toStringArray(raw.missedConcepts),
      resumeClaimConfidence: Array.isArray(raw.resumeClaimConfidence)
        ? raw.resumeClaimConfidence
            .map((c) => asObject(c))
            .filter((c) => toText(c.claim))
            .map((c) => ({
              claim: toText(c.claim),
              confidence: toScore(c.confidence),
              notes: toText(c.notes),
            }))
        : [],
      motivation: toText(raw.motivation),
    };
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

    const raw = asObject(await this.generateJson<unknown>(prompt));
    const topics = Array.isArray(raw.topics)
      ? raw.topics
          .map((t) => asObject(t))
          .filter((t) => toText(t.topic))
          .map((t) => ({
            topic: toText(t.topic),
            subtopics: toStringArray(t.subtopics),
            practiceQuestions: toStringArray(t.practiceQuestions),
          }))
      : [];
    return {
      topics,
      recommendedNextInterview: toText(
        raw.recommendedNextInterview,
        'Retake an interview on the topics above once you have reviewed them.',
      ),
    };
  }

  private async generateJson<T>(prompt: string): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: { responseMimeType: 'application/json' },
    });

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await model.generateContent(prompt, {
          timeout: REQUEST_TIMEOUT_MS,
        });
        const text = result.response.text();
        return this.parseJsonObject<T>(text);
      } catch (error) {
        lastError = error;
        if (this.isRetryableError(error) && attempt < MAX_RETRIES) {
          // Jitter (50-100% of the exponential delay) so concurrent clients that
          // failed together don't retry in lockstep.
          const ceiling = BASE_RETRY_DELAY_MS * 2 ** attempt;
          const delay = Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
          this.logger.warn(
            `Gemini request failed (${this.describeError(error)}), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
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

  /**
   * Transient failures worth retrying: retryable HTTP statuses, plus errors
   * with no status at all (timeouts/aborts and network failures such as
   * ECONNRESET). Malformed JSON, blocked responses and bad requests are not.
   */
  private isRetryableError(error: unknown): boolean {
    const status = this.extractStatusCode(error);
    if (status !== undefined) return RETRYABLE_STATUS_CODES.has(status);
    return !(
      error instanceof SyntaxError ||
      error instanceof GoogleGenerativeAIResponseError ||
      error instanceof GoogleGenerativeAIRequestInputError
    );
  }

  private describeError(error: unknown): string {
    const status = this.extractStatusCode(error);
    if (status !== undefined) return `status ${status}`;
    return error instanceof Error ? error.message : String(error);
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
