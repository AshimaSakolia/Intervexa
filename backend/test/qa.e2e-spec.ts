/* QA suite: runs the real app against a scratch Postgres DB with Gemini stubbed. */
process.env.DATABASE_URL =
  process.env.QA_DATABASE_URL ??
  'postgresql://interviewiq:interviewiq@localhost:3308/interviewiq_qa';
process.env.JWT_SECRET = 'qa-secret-qa-secret';
process.env.GEMINI_API_KEY = 'fake';
process.env.FRONTEND_URL = 'http://localhost:3009';

import { Test } from '@nestjs/testing';
import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { getStorageToken } from '@nestjs/throttler';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { GeminiService } from '../src/gemini/gemini.service';
import { PrismaService } from '../src/prisma/prisma.service';

function makePdf(text: string): Buffer {
  const esc = text.replace(/[\\()]/g, '\\$&');
  const stream = `BT /F1 12 Tf 50 700 Td (${esc}) Tj ET`;
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((o) => (out += `${String(o).padStart(10, '0')} 00000 n \n`));
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

const RESUME_TEXT =
  'Jane Doe Senior Backend Engineer. Built RabbitMQ based async workflows with NestJS and PostgreSQL for five years.';

const gemini = {
  role: { isValidRole: true, reason: null as string | null },
  analysis: (): unknown => ({
    isResume: true,
    notResumeReason: null,
    skills: ['a'],
    technologies: ['b'],
    projects: ['c'],
    experience: ['d'],
    claims: [{ text: 'Built RabbitMQ workflows', category: 'technical' }],
  }),
  question: (): unknown => ({
    question: 'Explain X?',
    topic: 'X',
    difficulty: 'MEDIUM',
    askedBecause: 'because',
  }),
  evaluation: (): unknown => ({
    technicalCorrectness: 80,
    technicalDepth: 70,
    problemSolving: 60,
    communication: 90,
    resumeUnderstanding: 50,
    overallScore: 72,
    feedback: 'ok',
    performanceLabel: 'STRONG',
  }),
  failNext: 0,
  calls: 0,
};
// Real GeminiService (so output normalization is exercised); only the network call is stubbed.
const fakeGemini = new GeminiService();
(fakeGemini as unknown as { generateJson: (p: string) => Promise<unknown> }).generateJson =
  async (prompt: string) => {
    if (prompt.includes('resume analyst')) return gemini.analysis();
    if (prompt.includes('plausible job title')) return gemini.role;
    if (prompt.includes('adaptive, one-question')) {
      gemini.calls++;
      if (gemini.failNext > 0) {
        gemini.failNext--;
        throw new ServiceUnavailableException('ai down');
      }
      return gemini.question();
    }
    if (prompt.includes('evaluating one answer')) return gemini.evaluation();
    if (prompt.includes('final evaluation report'))
      return {
        overallScore: 75,
        summary: 's',
        strengths: 'st',
        weaknesses: 'w',
        categoryScores: {
          technicalCorrectness: 1,
          technicalDepth: 1,
          problemSolving: 1,
          communication: 1,
          resumeUnderstanding: 1,
        },
        missedConcepts: ['m'],
        resumeClaimConfidence: [],
        motivation: 'go',
      };
    if (prompt.includes('study plan'))
      return {
        topics: [{ topic: 't', subtopics: ['s'], practiceQuestions: ['q'] }],
        recommendedNextInterview: 'r',
      };
    throw new Error('unrouted prompt');
  };

describe('QA', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  let n = 0;
  const email = () => `qa${Date.now()}_${n++}@example.com`;

  async function signup(e = email()) {
    const res = await http()
      .post('/auth/register')
      .send({ email: e, password: 'secret12', name: 'QA' })
      .expect(201);
    return { token: res.body.accessToken as string, email: e };
  }
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const interviewBody = (extra: object = {}) => ({
    resumeText: RESUME_TEXT,
    targetRole: 'Backend Engineer',
    interviewType: 'TECHNICAL',
    difficulty: 'MEDIUM',
    maxQuestions: 3,
    ...extra,
  });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GeminiService)
      .useValue(fakeGemini)
      .overrideProvider(getStorageToken())
      .useValue({
        increment: async () => ({
          totalHits: 1,
          timeToExpire: 0,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
      })
      .compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    gemini.failNext = 0;
    gemini.role = { isValidRole: true, reason: null };
  });

  describe('auth', () => {
    it('rejects malformed registrations', async () => {
      for (const body of [
        {},
        { email: 'nope', password: 'secret12', name: 'a' },
        { email: email(), password: '123', name: 'a' },
        { email: email(), password: 'x'.repeat(73), name: 'a' },
        { email: email(), password: 'secret12', name: '' },
        { email: email(), password: 'secret12', name: 'x'.repeat(101) },
        { email: email(), password: 12345678, name: 'a' },
      ]) {
        await http().post('/auth/register').send(body).expect(400);
      }
    });
    it('rejects whitespace-only name', async () => {
      await http()
        .post('/auth/register')
        .send({ email: email(), password: 'secret12', name: '   ' })
        .expect(400);
    });
    it('treats email case-insensitively', async () => {
      const e = email();
      await signup(e);
      await http()
        .post('/auth/register')
        .send({ email: e.toUpperCase(), password: 'secret12', name: 'dup' })
        .expect(409);
      await http()
        .post('/auth/login')
        .send({ email: e.toUpperCase(), password: 'secret12' })
        .expect(201);
      await http()
        .post('/auth/login')
        .send({ email: `  ${e}  `, password: 'secret12' })
        .expect(201);
    });
    it('concurrent duplicate registration yields 409 not 500', async () => {
      const e = email();
      const rs = await Promise.all(
        [1, 2, 3, 4].map(() =>
          http()
            .post('/auth/register')
            .send({ email: e, password: 'secret12', name: 'a' }),
        ),
      );
      const codes = rs.map((r) => r.status).sort();
      expect(codes.filter((c) => c === 201)).toHaveLength(1);
      expect(codes.every((c) => c === 201 || c === 409)).toBe(true);
    });
    it('login: wrong password / unknown user / non-string -> 401/400', async () => {
      const { email: e } = await signup();
      await http().post('/auth/login').send({ email: e, password: 'wrongpw' }).expect(401);
      await http().post('/auth/login').send({ email: 'x@y.com', password: 'wrongpw' }).expect(401);
      await http().post('/auth/login').send({ email: e }).expect(400);
      await http().post('/auth/login').send({ email: e, password: { $ne: 1 } }).expect(400);
    });
    it('multibyte password longer than 72 bytes is rejected, not silently truncated', async () => {
      await http()
        .post('/auth/register')
        .send({ email: email(), password: '€'.repeat(30), name: 'a' })
        .expect(400);
    });
    it('protected routes need a valid token', async () => {
      await http().get('/interviews').expect(401);
      await http().get('/resumes').expect(401);
      await http().get('/interviews').set('Authorization', 'Bearer garbage').expect(401);
      await http().get('/interviews').set('Authorization', 'Basic abc').expect(401);
      await http().patch('/auth/onboarding-complete').expect(401);
    });
    it('onboarding flag', async () => {
      const { token } = await signup();
      const r = await http().patch('/auth/onboarding-complete').set(auth(token)).expect(200);
      expect(r.body.hasSeenGuide).toBe(true);
    });
    it('token for a deleted user is rejected with 401', async () => {
      const { token, email: e } = await signup();
      await prisma.user.delete({ where: { email: e } });
      await http().get('/interviews').set(auth(token)).expect(401);
      await http().patch('/auth/onboarding-complete').set(auth(token)).expect(401);
    });
  });

  describe('misc http', () => {
    it('health ok', () => http().get('/health').expect(200));
    it('unknown route 404 json', async () => {
      const r = await http().get('/nope').expect(404);
      expect(r.body.statusCode).toBe(404);
    });
    it('malformed JSON body -> 400', () =>
      http()
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{bad')
        .expect(400));
    it('CORS allows only configured origin, tolerant of trailing slash config', async () => {
      const r = await http()
        .options('/interviews')
        .set('Origin', 'http://localhost:3009')
        .set('Access-Control-Request-Method', 'GET');
      expect(r.headers['access-control-allow-origin']).toBe('http://localhost:3009');
    });
  });

  describe('resumes', () => {
    it('requires a file', async () => {
      const { token } = await signup();
      await http().post('/resumes').set(auth(token)).expect(400);
    });
    it('rejects non-PDF, fake PDF mimetype, oversized', async () => {
      const { token } = await signup();
      await http()
        .post('/resumes').set(auth(token))
        .attach('file', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' })
        .expect(400);
      await http()
        .post('/resumes').set(auth(token))
        .attach('file', Buffer.from('hello world not pdf'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
      await http()
        .post('/resumes').set(auth(token))
        .attach('file', Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(6 * 1024 * 1024)]), {
          filename: 'a.pdf', contentType: 'application/pdf',
        })
        .expect(413);
    });
    it('corrupt PDF -> 400', async () => {
      const { token } = await signup();
      await http()
        .post('/resumes').set(auth(token))
        .attach('file', Buffer.from('%PDF-1.4 garbage garbage'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
    });
    it('wrong field name is a 4xx, not 500', async () => {
      const { token } = await signup();
      const r = await http().post('/resumes').set(auth(token))
        .attach('other', makePdf(RESUME_TEXT), { filename: 'a.pdf', contentType: 'application/pdf' });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    });
    it('too little text -> 400', async () => {
      const { token } = await signup();
      await http().post('/resumes').set(auth(token))
        .attach('file', makePdf('short'), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
    });
    it('happy path, ownership, delete', async () => {
      const a = await signup();
      const b = await signup();
      const up = await http().post('/resumes').set(auth(a.token))
        .attach('file', makePdf(RESUME_TEXT), { filename: 'cv.pdf', contentType: 'application/pdf' })
        .expect(201);
      const id = up.body.id;
      expect(up.body.claims).toHaveLength(1);
      await http().get(`/resumes/${id}`).set(auth(b.token)).expect(403);
      await http().get(`/resumes/${id}`).set(auth(a.token)).expect(200);
      expect((await http().get('/resumes').set(auth(b.token))).body).toHaveLength(0);
      await http().delete(`/resumes/${id}`).set(auth(b.token)).expect(403);
      // interview that uses the resume survives deletion
      const iv = await http().post('/interviews').set(auth(a.token))
        .send(interviewBody({ resumeText: undefined, resumeId: id })).expect(201);
      await http().delete(`/resumes/${id}`).set(auth(a.token)).expect(204);
      await http().get(`/resumes/${id}`).set(auth(a.token)).expect(404);
      await http().get(`/interviews/${iv.body.id}`).set(auth(a.token)).expect(200);
      await http().delete(`/resumes/${id}`).set(auth(a.token)).expect(404);
    });
    it('non-resume document rejected', async () => {
      const { token } = await signup();
      const old = gemini.analysis;
      gemini.analysis = () => ({ isResume: false, notResumeReason: 'invoice', claims: [] });
      await http().post('/resumes').set(auth(token))
        .attach('file', makePdf(RESUME_TEXT), { filename: 'a.pdf', contentType: 'application/pdf' })
        .expect(400);
      gemini.analysis = old;
    });
    it('AI returning odd claims shape does not 500', async () => {
      const { token } = await signup();
      const old = gemini.analysis;
      gemini.analysis = () => ({
        isResume: true,
        claims: [{ text: 'ok', category: 'technical' }, { text: null }, { category: 'x' }, 'str', null],
      });
      const r = await http().post('/resumes').set(auth(token))
        .attach('file', makePdf(RESUME_TEXT), { filename: 'a.pdf', contentType: 'application/pdf' });
      expect(r.status).toBe(201);
      gemini.analysis = old;
    });
    it('NUL bytes in extracted text do not 500', async () => {
      const { token } = await signup();
      const r = await http().post('/resumes').set(auth(token))
        .attach('file', makePdf(RESUME_TEXT + ' \\000 more text here'), { filename: 'a.pdf', contentType: 'application/pdf' });
      expect(r.status).toBe(201);
    });
    it('non-numeric / huge ids', async () => {
      const { token } = await signup();
      await http().get('/resumes/abc').set(auth(token)).expect(400);
      await http().get('/resumes/99999999999999').set(auth(token)).expect(404);
      await http().delete('/resumes/99999999999999').set(auth(token)).expect(404);
    });
  });

  describe('interviews', () => {
    it('validation', async () => {
      const { token } = await signup();
      const bad: object[] = [
        { resumeText: 'short' },
        { targetRole: '' },
        { targetRole: '   ' },
        { targetRole: 'x'.repeat(201) },
        { interviewType: 'NOPE' },
        { difficulty: 'NOPE' },
        { maxQuestions: 2 },
        { maxQuestions: 11 },
        { maxQuestions: 3.5 },
        { resumeText: 'x'.repeat(60_000) },
        { resumeText: undefined, resumeId: 0 },
        { resumeText: undefined, resumeId: -1 },
        { resumeText: undefined, resumeId: 99999999999 },
        { resumeText: undefined },
      ];
      for (const extra of bad) {
        const r = await http().post('/interviews').set(auth(token)).send(interviewBody(extra));
        expect([400, 404, 413]).toContain(r.status);
      }
    });
    it('invalid role rejected; nothing persisted', async () => {
      const { token } = await signup();
      gemini.role = { isValidRole: false, reason: 'gibberish' };
      await http().post('/interviews').set(auth(token)).send(interviewBody()).expect(400);
      expect((await http().get('/interviews').set(auth(token))).body).toHaveLength(0);
    });
    it('AI failure on first question leaves no orphan interview', async () => {
      const { token } = await signup();
      gemini.failNext = 1;
      await http().post('/interviews').set(auth(token)).send(interviewBody()).expect(503);
      expect((await http().get('/interviews').set(auth(token))).body).toHaveLength(0);
    });
    it('other users resume -> 403, unknown -> 404', async () => {
      const a = await signup();
      const b = await signup();
      const up = await http().post('/resumes').set(auth(a.token))
        .attach('file', makePdf(RESUME_TEXT), { filename: 'cv.pdf', contentType: 'application/pdf' });
      await http().post('/interviews').set(auth(b.token))
        .send(interviewBody({ resumeText: undefined, resumeId: up.body.id })).expect(403);
      await http().post('/interviews').set(auth(b.token))
        .send(interviewBody({ resumeText: undefined, resumeId: 987654 })).expect(404);
    });

    it('full flow with edge cases', async () => {
      const a = await signup();
      const b = await signup();
      const iv = await http().post('/interviews').set(auth(a.token)).send(interviewBody()).expect(201);
      const id = iv.body.id;
      expect(iv.body.questions).toHaveLength(1);
      // trimmed role stored
      // access control
      await http().get(`/interviews/${id}`).set(auth(b.token)).expect(403);
      await http().get('/interviews/99999999999').set(auth(a.token)).expect(404);
      await http().get('/interviews/abc').set(auth(a.token)).expect(400);
      // complete before any answer
      await http().post(`/interviews/${id}/complete`).set(auth(a.token)).expect(400);
      // bad answers
      const q1 = iv.body.questions[0].id;
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q1, text: '   ' }).expect(400);
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q1, text: 'x'.repeat(10001) }).expect(400);
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: '1', text: 'a' }).expect(400);
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: 99999999999, text: 'a' }).expect(400);
      await http().post(`/interviews/${id}/answers`).set(auth(b.token)).send({ questionId: q1, text: 'a' }).expect(403);
      // concurrent double submit
      const rs = await Promise.all(
        [1, 2, 3].map(() =>
          http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q1, text: 'my answer' }),
        ),
      );
      const ok = rs.filter((r) => r.status === 201);
      expect(ok).toHaveLength(1);
      expect(rs.filter((r) => r.status >= 500)).toHaveLength(0);
      const after = (await http().get(`/interviews/${id}`).set(auth(a.token))).body;
      expect(after.questions).toHaveLength(2); // exactly one next question
      // resubmit
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q1, text: 'again' }).expect(400);
      // answer 2 & 3, last flagged
      const q2 = after.questions[1].id;
      const r2 = await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q2, text: 'two' }).expect(201);
      expect(r2.body.isLastQuestion).toBe(false);
      const r3 = await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: r2.body.nextQuestion.id, text: 'three' }).expect(201);
      expect(r3.body.isLastQuestion).toBe(true);
      expect(r3.body.nextQuestion).toBeNull();
      // concurrent complete
      const cs = await Promise.all(
        [1, 2, 3].map(() => http().post(`/interviews/${id}/complete`).set(auth(a.token))),
      );
      expect(cs.filter((r) => r.status >= 500)).toHaveLength(0);
      expect(cs.every((r) => r.status === 201)).toBe(true);
      const done = (await http().get(`/interviews/${id}`).set(auth(a.token))).body;
      expect(done.status).toBe('COMPLETED');
      expect(done.report).toBeTruthy();
      expect(done.learningPlan).toBeTruthy();
      // answering after completion
      await http().post(`/interviews/${id}/answers`).set(auth(a.token)).send({ questionId: q1, text: 'late' }).expect(400);
      // completing again idempotent
      await http().post(`/interviews/${id}/complete`).set(auth(a.token)).expect(201);
      // list
      const list = (await http().get('/interviews').set(auth(a.token))).body;
      expect(list).toHaveLength(1);
      expect(list[0]).not.toHaveProperty('resumeText');
    });

    it('AI failure when generating next question is recoverable', async () => {
      const a = await signup();
      const iv = await http().post('/interviews').set(auth(a.token)).send(interviewBody()).expect(201);
      const id = iv.body.id;
      gemini.failNext = 1;
      const r = await http().post(`/interviews/${id}/answers`).set(auth(a.token))
        .send({ questionId: iv.body.questions[0].id, text: 'ans' });
      // answer must be saved, and client must be able to recover the next question
      const cur = (await http().get(`/interviews/${id}`).set(auth(a.token))).body;
      expect(cur.questions[0].answer).toBeTruthy();
      expect([201, 503]).toContain(r.status);
      const nq = await http().post(`/interviews/${id}/next-question`).set(auth(a.token)).expect(201);
      expect(nq.body.order).toBe(2);
      const again = await http().post(`/interviews/${id}/next-question`).set(auth(a.token)).expect(201);
      expect(again.body.id).toBe(nq.body.id); // idempotent
    });

    it('AI returning garbage scores / fields does not 500', async () => {
      const a = await signup();
      const iv = await http().post('/interviews').set(auth(a.token)).send(interviewBody()).expect(201);
      gemini.evaluation = () => ({
        technicalCorrectness: 72.6,
        technicalDepth: '80',
        problemSolving: 250,
        communication: -5,
        resumeUnderstanding: null,
        overallScore: NaN,
        feedback: null,
        performanceLabel: 'WEIRD',
      });
      gemini.question = () => ({ question: 'Q?', topic: 5, difficulty: 'nope', askedBecause: null });
      const r = await http().post(`/interviews/${iv.body.id}/answers`).set(auth(a.token))
        .send({ questionId: iv.body.questions[0].id, text: 'ans' });
      expect(r.status).toBe(201);
      const s = r.body.answer;
      for (const k of ['technicalCorrectness', 'technicalDepth', 'problemSolving', 'communication', 'overallScore']) {
        const v = k === 'overallScore' ? s.score : s[k];
        expect(Number.isInteger(v) ? v >= 0 && v <= 100 : v === null).toBe(true);
      }
      gemini.evaluation = () => ({
        technicalCorrectness: 80, technicalDepth: 70, problemSolving: 60, communication: 90,
        resumeUnderstanding: 50, overallScore: 72, feedback: 'ok', performanceLabel: 'STRONG',
      });
      gemini.question = () => ({ question: 'Explain X?', topic: 'X', difficulty: 'MEDIUM', askedBecause: 'because' });
    });

    it('AI returning empty question text -> 5xx handled as 503, no partial data', async () => {
      const a = await signup();
      const old = gemini.question;
      gemini.question = () => ({ topic: 'x' });
      const r = await http().post('/interviews').set(auth(a.token)).send(interviewBody());
      expect(r.status).toBe(503);
      expect((await http().get('/interviews').set(auth(a.token))).body).toHaveLength(0);
      gemini.question = old;
    });
  });
});
