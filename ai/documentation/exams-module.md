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

### Entity: `Preamble`

```
src/modules/exams/test/entities/preamble.entity.ts
```

A preamble is an introductory block of text (passage, scenario, diagram description, etc.) that provides shared context for one or more sub-questions. When a student encounters a preamble, they read the body once and then answer every sub-question beneath it. Answers are submitted for the whole preamble in a single call, not question by question.

Standalone questions (those with no preamble) continue to be submitted individually via `submitAnswer`.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `body` | text | The shared introductory text shown above all sub-questions |
| `test` | ManyToOne → Test | Owning side |
| `questions` | OneToMany → Question | The sub-questions that belong to this preamble |

Relation: A `Test` has many `Preamble`s (`@OneToMany` on `Test.preambles`).

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
| `preamble` | ManyToOne → Preamble nullable | Set when the question belongs to a preamble; null for standalone questions |
| `test` | ManyToOne → Test | Owning side — set on all questions regardless of preamble |

Relations:
- A `Test` has many standalone `Question`s (`@OneToMany` on `Test.questions`).
- A `Preamble` has many `Question`s (`@OneToMany` on `Preamble.questions`).

### Entity: `TestSuite`

```
src/modules/exams/test/entities/test-suite.entity.ts
```

A suite is a shuffled subset of the parent test's content pool. The pool is made up of two kinds of items: **standalone questions** and **preambles** (which each carry their sub-questions as an indivisible group). The lecturer configures how many suites to create and how many total questions (including preamble sub-questions) each suite should contain. Suites have no secret of their own — the secret lives on the `Test` and is used only to gate entry; suite assignment is random.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `questions` | ManyToMany → Question | Standalone questions selected for this suite |
| `preambles` | ManyToMany → Preamble | Preambles selected for this suite (their sub-questions are included automatically) |
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
| `secret` | string | Hashed passphrase set by the lecturer; all students use this single secret to access the test |
| `course` | ManyToOne → Course | |
| `lecturer` | ManyToOne → Lecturer | |
| `questions` | OneToMany → Question | Full pool of standalone questions (no preamble) |
| `preambles` | OneToMany → Preamble | Full pool of preambles (each carries its own sub-questions) |
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

1. Hash the single `secret` from the input and store it on the `Test` record.
2. Build a flat list of **items** from the test content pool. Each item is either:
   - A standalone `Question` (question count contribution = 1), or
   - A `Preamble` (question count contribution = number of its sub-questions).
3. For each suite (1..`total_suites`):
   a. Shuffle a copy of the items array using a Fisher-Yates shuffle. **Preambles are shuffled as atomic units** — their sub-questions are never split across suites.
   b. Greedily take items in shuffled order, accumulating their question counts, until the running total reaches `total_questions_per_suite`. If adding the next item would overshoot the target, skip it and continue with the remaining items (prefer filling exactly).
   c. Create a `TestSuite` record linking the selected standalone questions and preambles — no secret on the suite.
4. The same question or preamble can appear in multiple suites — this is intentional.

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
      preamble.entity.ts
      question.entity.ts
      test-suite.entity.ts
      test.entity.ts
      test-attempt.entity.ts
      answer-submission.entity.ts
```

### Input Types (add to `src/shared/inputs/`)

```typescript
// Used for both standalone questions and preamble sub-questions
CreateQuestionInput {
  body: string
  type: QuestionType
  options?: { label: string; value: string }[]  // OBJECTIVE only
  correct_answer?: string
  marks: number
}

// A preamble groups related questions under shared introductory text
CreatePreambleInput {
  body: string                    // the shared context/passage
  questions: CreateQuestionInput[] // sub-questions for this preamble; minimum 1
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
  secret: string                  // single plain-text passphrase; service hashes before storing on Test
  questions: CreateQuestionInput[] // standalone questions (no preamble)
  preambles?: CreatePreambleInput[] // preamble blocks; optional if all questions are standalone
}

StartTestInput {
  testId: string
  secret: string             // plain-text; service bcrypt-compares against Test.secret
                             // if correct, a suite is randomly selected for this student
}

EndTestInput {
  attemptId: string
}

// For standalone questions only
SubmitAnswerInput {
  attemptId: string
  questionId: string
  selected_option?: string   // OBJECTIVE
  answer_text?: string       // FILL_IN or WRITTEN
}

// Per-question answer item used inside SubmitPreambleAnswersInput
PreambleQuestionAnswerInput {
  questionId: string
  selected_option?: string
  answer_text?: string
}

// Submits answers for every sub-question in a preamble in a single call
SubmitPreambleAnswersInput {
  attemptId: string
  preambleId: string
  answers: PreambleQuestionAnswerInput[]  // one entry per sub-question in the preamble
}

UpdateTestCompletionTimeInput {
  testId: string                // required — scopes the operation to a specific test the lecturer owns
  additional_minutes: number
  // Targeting — provide exactly one of the two options below:
  classId?: string              // extend time for all ON_GOING attempts from students in this class
  testAttemptIds?: string[]     // extend time for a specific list of attempt IDs
  // If neither is provided, the update applies to ALL ON_GOING attempts for the test (full cohort).
}

ListTestAttemptsFilterInput {
  testId: string             // required
  suiteId?: string           // optional — filter to attempts assigned a specific suite
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
  #   - input.secret must match Test.secret (bcrypt compare)
  #   - student must not already have an ON_GOING attempt for this test
  # On success: randomly select one TestSuite from Test.suites and assign it to the new attempt.
  # Creates TestAttempt with state=ON_GOING, started_at=now.

endTest(input: EndTestInput!): TestAttempt
  # Auth: Student
  # Applies auto-end logic, then sets state=ENDED if still ON_GOING.
  # Grades all deterministic answers immediately (set is_correct, marks_awarded).
  # Queues AI grading job for non-deterministic answers if show_answer=true.
  # Safe to call multiple times — idempotent if already ENDED.

submitAnswer(input: SubmitAnswerInput!): AnswerSubmission
  # Auth: Student
  # For standalone questions only (question.preamble is null).
  # Applies auto-end logic first (may end the attempt before saving).
  # If attempt is ENDED after check, return error: attempt has ended.
  # Upserts AnswerSubmission for (attemptId, questionId).

submitPreambleAnswers(input: SubmitPreambleAnswersInput!): [AnswerSubmission]
  # Auth: Student
  # For preamble-grouped questions. Submits all sub-question answers in one atomic call.
  # Applies auto-end logic first; returns error if attempt is already ENDED.
  # Each entry in input.answers upserts one AnswerSubmission for (attemptId, questionId).
  # Validates that every questionId in input.answers belongs to the given preamble.
  # Returns the full list of AnswerSubmissions for the preamble after upsert.

updateTestCompletionTime(input: UpdateTestCompletionTimeInput!): [TestAttempt]
  # Auth: Lecturer
  # Adds additional_minutes to extended_minutes on the targeted ON_GOING attempts.
  # Targeting precedence (mutually exclusive; validate that at most one is supplied):
  #   - testAttemptIds supplied → update only those specific attempts
  #   - classId supplied        → update all ON_GOING attempts whose student belongs to that class
  #   - neither supplied        → update all ON_GOING attempts for the test (full cohort)
  # Always scoped to testId — lecturer cannot modify attempts on a test they don't own.
  # Returns the updated attempts.
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
  # testId is mandatory.
  # suiteId is optional — omit to list all attempts across all suites for the test.
  # Optional filter by state.
  # Applies auto-end logic to every ON_GOING attempt before returning.
```

---

## Grading Rules

### Deterministic (OBJECTIVE, FILL_IN with `correct_answer` set)

Run synchronously inside `endTest`. Applies equally to standalone questions and preamble sub-questions — grading is per `AnswerSubmission` regardless of how the answer was submitted:
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
    TypeOrmModule.forFeature([Test, TestSuite, Preamble, Question, TestAttempt, AnswerSubmission]),
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

- `createTest` — verifies suite count and question count per suite; verifies preamble sub-questions are kept together in suites
- `startTest` — rejects outside time window; rejects wrong secret; rejects duplicate active attempt; verifies random suite is assigned
- `endTest` — idempotent; grades deterministic answers (standalone and preamble sub-questions alike); queues non-deterministic jobs
- `submitAnswer` — auto-ends expired attempt before saving; rejects submission on ended attempt; rejects if question belongs to a preamble (must use `submitPreambleAnswers`)
- `submitPreambleAnswers` — auto-ends expired attempt; rejects on ended attempt; validates all questionIds belong to the preamble; upserts all answers atomically
- `updateTestCompletionTime` — three modes: by specific attemptIds, by classId, or full cohort; rejects if both classId and testAttemptIds are supplied together
- `getTestAttempt` — auto-ends expired attempt; hides answer fields when `show_answer=false`
- `listTestAttempts` — filters by state; applies auto-end

---

## Security Notes

- The test secret is stored hashed (bcrypt) on the `Test` entity. Never return the raw or hashed secret in any GraphQL response.
- `startTest` must confirm the calling user is a student enrolled in the course.
- `createTest` must confirm the calling user is the lecturer assigned to the course.
- `listTestAttempts` and `updateTestCompletionTime` must confirm the calling user owns the test.
- `submitAnswer` and `endTest` must confirm the calling student owns the attempt.
