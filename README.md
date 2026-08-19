# InterviewIQ

An AI-powered adaptive mock interview platform. Upload a resume, pick a target
role and difficulty, and practice against interview questions generated from
what you've actually built — questions that adapt in real time to how you
answer, verify specific claims from your resume, and end in a full evaluation
report with a personalized learning plan.

## What it does

- **Resume-grounded questions** — upload a PDF resume; Gemini extracts skills,
  technologies, projects, experience, and specific claims worth probing.
- **Adaptive interview flow** — one question at a time. Each answer is scored,
  labeled (strong / weak / incorrect / interesting / average), and the next
  question adapts: harder when you're strong, a clarifying follow-up when
  you're not, a simpler question on the same concept when you're wrong.
- **Resume claim verification** — questions occasionally target a specific
  claim from your resume ("built RabbitMQ-based async workflows...") to check
  real understanding, not just keyword presence.
- **Multi-category evaluation** — every answer is scored on technical
  correctness, technical depth, problem solving, communication, and resume
  understanding, not a single number.
- **Full report** — overall score, category breakdown, strengths, weaknesses,
  missed concepts, resume claim confidence, and a calibrated closing note.
- **Personalized learning plan** — topics to study, subtopics, practice
  questions, and a recommendation for what to attempt next, generated from
  where you actually fell short.
- **Interview types** — Technical, HR, Behavioral, Project, System Design —
  each at Easy / Medium / Hard difficulty.

## Stack

- **Backend:** NestJS, Prisma ORM, MySQL, JWT auth, `@nestjs/throttler` rate
  limiting, `@nestjs/config` env validation, PDF text extraction (`pdf-parse`)
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, light/dark
  theming
- **AI:** Google Gemini API

## Project structure

```
backend/
  src/auth/        registration, login, JWT strategy
  src/resume/       PDF upload, text extraction, Gemini resume analysis
  src/interview/    adaptive question generation, evaluation, reports
  src/gemini/       all Gemini prompts + retry/backoff on rate limits
  src/config/       startup environment validation
  src/common/       global exception filter
  prisma/           schema + migrations (MySQL)

frontend/
  src/app/dashboard         start an interview, recent activity, stats
  src/app/interviews        full interview history with filters
  src/app/interview/[id]    live adaptive Q&A flow
  src/app/interview/[id]/report   evaluation report + learning plan
  src/app/resume            upload resumes, browse parsed analysis
  src/app/resources         static interview-prep guide

```

## Running locally

### 1. Set up MySQL

Use a local MySQL 8 instance (installed directly, or run your own container),
and create a database and user matching what you put in `DATABASE_URL` below.
For example, with Docker:

```bash
docker run -d --name interviewiq-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=interviewiq \
  -e MYSQL_USER=interviewiq \
  -e MYSQL_PASSWORD=interviewiq \
  -p 3308:3306 \
  mysql:8.0
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in GEMINI_API_KEY (free key: https://aistudio.google.com/apikey)
                        # and a real JWT_SECRET — the app refuses to boot with the placeholder
npx prisma migrate dev
npm run start:dev       # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

## API overview

| Method | Route                        | Description                                    |
|--------|-------------------------------|-------------------------------------------------|
| POST   | `/auth/register`              | Create an account                               |
| POST   | `/auth/login`                 | Log in, returns a JWT                           |
| POST   | `/resumes`                    | Upload a resume PDF, returns parsed analysis    |
| GET    | `/resumes`                    | List your resumes                               |
| GET    | `/resumes/:id`                | Get one resume (analysis + extracted claims)    |
| POST   | `/interviews`                 | Start an interview (generates the first question) |
| GET    | `/interviews`                 | List your interviews                            |
| GET    | `/interviews/:id`             | Get one interview (questions, answers, report)  |
| POST   | `/interviews/:id/answers`     | Submit an answer — returns score + the next question |
| POST   | `/interviews/:id/complete`    | Generate the final report and learning plan     |
| GET    | `/health`                     | Health check (verifies DB connectivity)         |

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.
The AI-calling routes (`/resumes`, `/interviews`, `/interviews/:id/answers`,
`/interviews/:id/complete`) are rate-limited to protect against runaway Gemini
usage.

## Testing

```bash
cd backend
npm run test        # unit tests
npm run test:e2e     # end-to-end tests
```
