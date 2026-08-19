const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface ApiUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: ApiUser;
}

export type InterviewType = "TECHNICAL" | "HR" | "BEHAVIORAL" | "PROJECT" | "SYSTEM_DESIGN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type PerformanceLabel = "STRONG" | "WEAK" | "INCORRECT" | "INTERESTING" | "AVERAGE";

export interface ResumeAnalysis {
  skills: string[];
  technologies: string[];
  projects: string[];
  experience: string[];
  claims: { text: string; category: string }[];
}

export interface ResumeClaim {
  id: number;
  resumeId: number;
  text: string;
  category: string;
  confidence: number | null;
  notes: string | null;
}

export interface Resume {
  id: number;
  userId: number;
  fileName: string;
  rawText: string;
  analysis: string | null;
  createdAt: string;
  claims: ResumeClaim[];
}

export interface Answer {
  id: number;
  questionId: number;
  text: string;
  score: number | null;
  feedback: string | null;
  technicalCorrectness: number | null;
  technicalDepth: number | null;
  problemSolving: number | null;
  communication: number | null;
  resumeUnderstanding: number | null;
  performanceLabel: PerformanceLabel | null;
  createdAt: string;
}

export interface Question {
  id: number;
  interviewId: number;
  text: string;
  order: number;
  topic: string | null;
  difficulty: Difficulty | null;
  askedBecause: string | null;
  targetsClaimId: number | null;
  createdAt: string;
  answer: Answer | null;
}

export interface CategoryScores {
  technicalCorrectness: number;
  technicalDepth: number;
  problemSolving: number;
  communication: number;
  resumeUnderstanding: number;
}

export interface ResumeClaimConfidence {
  claim: string;
  confidence: number;
  notes: string;
}

export interface Report {
  id: number;
  interviewId: number;
  overallScore: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  categoryScores: string | null;
  missedConcepts: string | null;
  resumeClaimConfidence: string | null;
  motivation: string | null;
  createdAt: string;
}

export interface LearningPlanTopic {
  topic: string;
  subtopics: string[];
  practiceQuestions: string[];
}

export interface LearningPlan {
  id: number;
  interviewId: number;
  topics: string;
  recommendedNextInterview: string;
  createdAt: string;
}

export interface Interview {
  id: number;
  userId: number;
  resumeId: number | null;
  resumeText: string;
  targetRole: string;
  interviewType: InterviewType;
  difficulty: Difficulty;
  maxQuestions: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
  completedAt: string | null;
  questions: Question[];
  report: Report | null;
  learningPlan: LearningPlan | null;
  resume?: Resume | null;
}

export interface SubmitAnswerResponse {
  answer: Answer;
  nextQuestion: Question | null;
  isLastQuestion: boolean;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null; formData?: FormData } = {}
): Promise<T> {
  const { method = "GET", body, token, formData } = options;

  const headers: Record<string, string> = {};
  if (!formData) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) {
        message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      }
    } catch {
      // ignore parse error, use default message
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function parseAnalysis(resume: Resume | null | undefined): ResumeAnalysis | null {
  if (!resume?.analysis) return null;
  try {
    return JSON.parse(resume.analysis) as ResumeAnalysis;
  } catch {
    return null;
  }
}

export function parseCategoryScores(report: Report | null | undefined): CategoryScores | null {
  if (!report?.categoryScores) return null;
  try {
    return JSON.parse(report.categoryScores) as CategoryScores;
  } catch {
    return null;
  }
}

export function parseMissedConcepts(report: Report | null | undefined): string[] {
  if (!report?.missedConcepts) return [];
  try {
    return JSON.parse(report.missedConcepts) as string[];
  } catch {
    return [];
  }
}

export function parseResumeClaimConfidence(report: Report | null | undefined): ResumeClaimConfidence[] {
  if (!report?.resumeClaimConfidence) return [];
  try {
    return JSON.parse(report.resumeClaimConfidence) as ResumeClaimConfidence[];
  } catch {
    return [];
  }
}

export function parseLearningPlanTopics(plan: LearningPlan | null | undefined): LearningPlanTopic[] {
  if (!plan?.topics) return [];
  try {
    return JSON.parse(plan.topics) as LearningPlanTopic[];
  } catch {
    return [];
  }
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: { email, password, name } }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }),

  uploadResume: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<Resume>("/resumes", { method: "POST", token, formData });
  },

  getResumes: (token: string) => request<Resume[]>("/resumes", { token }),

  getResume: (token: string, id: number) => request<Resume>(`/resumes/${id}`, { token }),

  createInterview: (
    token: string,
    params: {
      resumeId?: number;
      resumeText?: string;
      targetRole: string;
      interviewType: InterviewType;
      difficulty: Difficulty;
      maxQuestions?: number;
    }
  ) => request<Interview>("/interviews", { method: "POST", token, body: params }),

  getInterviews: (token: string) => request<Interview[]>("/interviews", { token }),

  getInterview: (token: string, id: string | number) =>
    request<Interview>(`/interviews/${id}`, { token }),

  submitAnswer: (token: string, interviewId: string | number, questionId: number, text: string) =>
    request<SubmitAnswerResponse>(`/interviews/${interviewId}/answers`, {
      method: "POST",
      token,
      body: { questionId, text },
    }),

  completeInterview: (token: string, interviewId: string | number) =>
    request<Report>(`/interviews/${interviewId}/complete`, { method: "POST", token }),
};
