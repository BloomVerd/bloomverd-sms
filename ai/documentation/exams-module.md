# Exams Module

## Overview

Add a new `src/modules/exams/` NestJS module that covers test creation, delivery, and grading for the Bloomverd SMS. A **Test** is a template created by a lecturer for a specific course. A **TestAttempt** is the live, per-student instance created when a student starts the test.

This document is the full spec. Implement everything described here unless a section is marked *future*.

---

## Prerequisites

Complete the **entity-graphql-type-merge-refactor** before starting this module. All new entities in this module must follow the merged pattern — one class with both `@Entity` and `@ObjectType` decorators.

---

## Data Model

### Enums (add to `src/shared/enums/`)

```typescript
export enum TestType {
  NORMAL_TEST = 'normal_test',           // learning mode, unproctored
  CLASS_TEST = 'class_test',             // proctored
  MID_SEMESTER = 'mid_semester',         // proctored
  END_OF_SEMESTER_EXAM = 'end_of_semester_exam', // proctored
}

export enum TestPlatform {
  APP = 'app',
  WEB = 'web',
}

export enum TestAttemptState {
  NOT_STARTED = 'not_started',
  ON_GOING = 'on_going',
  ENDED = 'ended',
}

export enum QuestionType {
  OBJECTIVE = 'objective',         // multiple choice — deterministic
  FILL_IN = 'fill_in',             // short answer — non-deterministic
  WRITTEN = 'written',             // long-form / drawing pad — non-deterministic
}
```

### Entity: `Question`

```
src/modules/exams/test/entities/question.entity.ts
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `body` | text | The question stem |
| `type` | enum QuestionType | |
| `options` | jsonb nullable | Array of `{ label: string; value: string }` — only for OBJECTIVE |
| `correct_answer` | text nullable | For OBJECTIVE and FILL_IN; null for WRITTEN |
| `marks` | integer | Points awarded for a correct answer |
| `test` | ManyToOne → Test | Owning side |

Relation: A `Test` has many `Question`s (`@OneToMany` on `Test.questions`).

### Entity: `TestSuite`

```
src/modules/exams/test/entities/test-suite.entity.ts
```

A suite is a shuffled subset of questions drawn from the parent test's question pool. The lecturer configures how many suites to create and how many questions each suite should contain when calling `createTest`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `secret` | string | Hashed passphrase set by the lecturer; student must enter this to start |
| `questions` | ManyToMany → Question | The specific questions in this suite (shuffled order) |
| `test` | ManyToOne → Test | |

Relation: A `Test` has many `TestSuite`s (`@OneToMany` on `Test.suites`).

### Entity: `Test`

```
src/modules/exams/test/entities/test.entity.ts
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | string | |
| `type` | enum TestType | |
| `platforms` | simple-array or jsonb | e.g. `['app', 'web']` |
| `duration_minutes` | integer | How long a student has once they start |
| `start_time` | timestamp | Earliest time a student may start |
| `end_time` | timestamp | Latest time a student may start (window closes) |
| `total_suites` | integer | Number of suites to generate |
| `total_questions_per_suite` | integer | Questions per suite |
| `show_answer` | boolean default false | Whether answers are revealed after the attempt ends |
| `course` | ManyToOne → Course | |
| `lecturer` | ManyToOne → Lecturer | |
| `questions` | OneToMany → Question | Full question pool |
| `suites` | OneToMany → TestSuite | Generated suites |
| `attempts` | OneToMany → TestAttempt | |
| `inserted_at` | CreateDateColumn | |
| `updated_at` | UpdateDateColumn | |

### Entity: `AnswerSubmission`

```
src/modules/exams/test/entities/answer-submission.entity.ts
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `question` | ManyToOne → Question | |
| `attempt` | ManyToOne → TestAttempt | |
| `answer_text` | text nullable | Student's raw answer (fill-in / written) |
| `selected_option` | string nullable | For OBJECTIVE — the chosen option value |
| `is_correct` | boolean nullable | Set automatically for deterministic questions; null until AI grades non-deterministic |
| `ai_feedback` | text nullable | AI-generated feedback for non-deterministic answers |
| `marks_awarded` | integer nullable | Populated after grading |

### Entity: `TestAttempt`

```
src/modules/exams/test/entities/test-attempt.entity.ts
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `state` | enum TestAttemptState default NOT_STARTED | |
| `suite` | ManyToOne → TestSuite | Which suite the student is taking |
| `test` | ManyToOne → Test | |
| `student` | ManyToOne → Student | |
| `started_at` | timestamp nullable | Set when student calls `startTest` |
| `ended_at` | timestamp nullable | Set when attempt is ended (any path) |
| `extended_minutes` | integer default 0 | Additional time granted by lecturer |
| `score` | integer nullable | Total marks awarded after grading |
| `answers` | OneToMany → AnswerSubmission | |
| `inserted_at` | CreateDateColumn | |
| `updated_at` | UpdateDateColumn | |

**Computed deadline for a live attempt:**
```
deadline = started_at + duration_minutes + extended_minutes (in minutes)
```

---

## Auto-End Logic (Synchronous State Check)

On **any** read or write operation that loads a `TestAttempt`, the service must run the following check before returning:

```
if attempt.state === ON_GOING
  AND now > (attempt.started_at + test.duration_minutes + attempt.extended_minutes minutes)
  THEN set attempt.state = ENDED, attempt.ended_at = now, save, then continue
```

This ensures the attempt is always in a consistent state regardless of which path ended it (student action, tab-switch detection, or direct API call).

---

## Suite Generation Algorithm

When `createTest` is called the service must generate suites immediately:

1. Take the full list of submitted questions (length = `N`).
2. For each suite (1..`total_suites`):
   a. Shuffle a copy of the question array using a Fisher-Yates shuffle.
   b. Slice the first `total_questions_per_suite` questions.
   c. Create a `TestSuite` record with a unique hashed `secret` provided by the lecturer per suite (the mutation input must include one secret per suite).
3. The same question can appear in multiple suites — this is intentional.

---

## GraphQL API

### Module structure

```
src/modules/exams/
  exams.module.ts
  test/
    test.resolver.ts
    test.service.ts
    test.service.spec.ts
    entities/
      question.entity.ts
      test-suite.entity.ts
      test.entity.ts
      test-attempt.entity.ts
      answer-submission.entity.ts
```

### Input Types (add to `src/shared/inputs/`)

```typescript
// Question input used inside CreateTestInput
CreateQuestionInput {
  body: string
  type: QuestionType
  options?: { label: string; value: string }[]  // OBJECTIVE only
  correct_answer?: string
  marks: number
}

// Suite secret input — one per suite
CreateSuiteSecretInput {
  secret: string   // plain text; service hashes before storing
}

CreateTestInput {
  title: string
  courseId: string
  type: TestType
  platforms: TestPlatform[]
  duration_minutes: number
  start_time: Date
  end_time: Date
  total_suites: number
  total_questions_per_suite: number
  show_answer?: boolean
  questions: CreateQuestionInput[]
  suite_secrets: CreateSuiteSecretInput[]   // length must equal total_suites
}

StartTestInput {
  testId: string
  suite_secret: string   // plain-text secret; service matches against hashed suite secrets
}

EndTestInput {
  attemptId: string
}

SubmitAnswerInput {
  attemptId: string
  questionId: string
  selected_option?: string   // OBJECTIVE
  answer_text?: string       // FILL_IN or WRITTEN
}

UpdateTestCompletionTimeInput {
  testId: string
  suiteId: string            // extend time for all attempts on this suite
  additional_minutes: number
}

ListTestAttemptsFilterInput {
  suiteId: string            // required
  state?: TestAttemptState
}
```

### Mutations

```graphql
createTest(input: CreateTestInput!): Test
  # Auth: Lecturer
  # Creates Test, Questions, and TestSuites in a single transaction.

startTest(input: StartTestInput!): TestAttempt
  # Auth: Student
  # Guards:
  #   - now must be >= test.start_time and <= test.end_time
  #   - suite_secret must match exactly one TestSuite.secret (bcrypt compare)
  #   - student must not already have an ON_GOING attempt for this test
  # Creates TestAttempt with state=ON_GOING, started_at=now.

endTest(input: EndTestInput!): TestAttempt
  # Auth: Student
  # Applies auto-end logic, then sets state=ENDED if still ON_GOING.
  # Grades all deterministic answers immediately (set is_correct, marks_awarded).
  # Queues AI grading job for non-deterministic answers if show_answer=true.
  # Safe to call multiple times — idempotent if already ENDED.

submitAnswer(input: SubmitAnswerInput!): AnswerSubmission
  # Auth: Student
  # Applies auto-end logic first (may end the attempt before saving).
  # If attempt is ENDED after check, return error: attempt has ended.
  # Upserts AnswerSubmission for (attemptId, questionId).

updateTestCompletionTime(input: UpdateTestCompletionTimeInput!): [TestAttempt]
  # Auth: Lecturer
  # Adds additional_minutes to extended_minutes on every ON_GOING attempt for the given suite.
  # Returns updated attempts.
```

### Queries

```graphql
getTestAttempt(attemptId: String!): TestAttempt
  # Auth: Student (own attempt) or Lecturer (any attempt on their test)
  # Applies auto-end logic before returning.
  # If show_answer=true and attempt is ENDED:
  #   - Deterministic answers include is_correct and marks_awarded.
  #   - Non-deterministic answers include ai_feedback and marks_awarded only if AI grading is complete (non-null).
  #   - Client should poll/subscribe for non-deterministic results.

listTestAttempts(filter: ListTestAttemptsFilterInput!): [TestAttempt]
  # Auth: Lecturer only
  # suiteId is mandatory.
  # Optional filter by state.
  # Applies auto-end logic to every ON_GOING attempt before returning.
```

---

## Grading Rules

### Deterministic (OBJECTIVE, FILL_IN with `correct_answer` set)

Run synchronously inside `endTest`:
- Compare `selected_option` or `answer_text` (case-insensitive trim) against `question.correct_answer`.
- Set `is_correct`, `marks_awarded = question.marks` if correct else `0`.

### Non-Deterministic (WRITTEN, or FILL_IN without `correct_answer`)

If `test.show_answer === true`:
- After `endTest` grades deterministic answers, enqueue a background job (BullMQ) for each non-deterministic `AnswerSubmission`.
- The job calls an AI model and populates `ai_feedback` and `marks_awarded`.
- The job does **not** block the `endTest` response.
- `getTestAttempt` returns whatever is already populated; the UI polls until all fields are non-null.

If `test.show_answer === false`, skip grading entirely.

---

## Module Registration

```typescript
// exams.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Test, TestSuite, Question, TestAttempt, AnswerSubmission]),
    BullModule.registerQueue({ name: 'exam-grading-queue' }),
  ],
  providers: [TestResolver, TestService],
})
export class ExamsModule {}
```

Register `ExamsModule` in `app.module.ts`.

---

## Tests (test.service.spec.ts)

Implement unit tests for:

- `createTest` — verifies suite count and question count per suite
- `startTest` — rejects outside time window; rejects wrong secret; rejects duplicate active attempt
- `endTest` — idempotent; grades deterministic answers; queues non-deterministic jobs
- `submitAnswer` — auto-ends expired attempt before saving; rejects submission on ended attempt
- `updateTestCompletionTime` — updates `extended_minutes` only on ON_GOING attempts
- `getTestAttempt` — auto-ends expired attempt; hides answer fields when `show_answer=false`
- `listTestAttempts` — filters by state; applies auto-end

---

## Security Notes

- Suite secrets are stored hashed (bcrypt). Never return raw or hashed secrets in any GraphQL response.
- `startTest` must confirm the calling user is a student enrolled in the course.
- `createTest` must confirm the calling user is the lecturer assigned to the course.
- `listTestAttempts` and `updateTestCompletionTime` must confirm the calling user owns the test.
- `submitAnswer` and `endTest` must confirm the calling student owns the attempt.
