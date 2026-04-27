# Exam Module — UI Design Prompt

This document is a **design brief** for building the front-end that consumes the `exams` GraphQL module. It is derived directly from the backend contract and covers two delivery modes: **proctored** (high-stakes) and **unproctored** (learning).

Use this as the source of truth when wireframing or generating UI specs. Every UI affordance below is justified by something in the API. If a behaviour is not described here, it is **out of scope** for the first release.

---

## 1. Mental model: how the backend shapes the UI

The backend exposes three primary actor flows. The UI is essentially a thin shell around them.

| Actor | Top-level intent | Backed by |
|---|---|---|
| **Lecturer (author)** | "Make a test, watch it run, grant time" | `createTest`, `listTestAttempts`, `updateTestCompletionTime` |
| **Student (taker)** | "Find the test, prove I have the secret, take it, see results" | `startTest`, `submitAnswer`, `submitPreambleAnswers`, `endTest`, `getTestAttempt` |
| **Lecturer/Student (review)** | "Look back at an attempt" | `getTestAttempt`, `listTestAttempts` |

Three structural facts shape the entire UI:

1. **A `Test` is a template; a `TestAttempt` is the live instance.** The student never edits the Test — they only own the Attempt. The UI must therefore separate "the test exists" (visible to enrolled students before/during the window) from "I am inside an attempt" (the live test runner).
2. **The student gets a randomly-assigned `TestSuite`** when `startTest` succeeds. The student does **not** see all questions of the test — only the questions/preambles in their suite. Two students sitting next to each other almost certainly see different questions.
3. **`Preamble` is an indivisible block.** A preamble carries shared introductory text (a passage, a scenario) plus N sub-questions. Sub-questions are submitted **together in one call** (`submitPreambleAnswers`), not individually. The UI must group them visually and submit them atomically.

---

## 2. Lecturer flow — authoring (`createTest`)

The author UI is the most complex screen in the module. Build it as a **multi-step wizard** with the following stages, mirroring the `CreateTestInput` shape.

### 2.1 Step 1 — Metadata
| Field | Backend constraint | UI |
|---|---|---|
| `title` | required, free text | text input |
| `courseId` | required; lecturer must belong to a department running this course (`createTest` enforces this server-side) | dropdown of courses the lecturer can create for; if empty, show "you are not assigned to any course" |
| `type` | enum of 4: `NORMAL_TEST`, `CLASS_TEST`, `MID_SEMESTER`, `END_OF_SEMESTER_EXAM` | radio cards. Selecting `NORMAL_TEST` should change the rest of the UI to "unproctored mode" (see §6); the other three are proctored. |
| `platforms` | enum array of `app`, `web` | multi-select toggle |

### 2.2 Step 2 — Schedule + duration
| Field | Constraint | UI |
|---|---|---|
| `start_time` | timestamp; `start_time < end_time` | datetime picker |
| `end_time` | timestamp | datetime picker |
| `duration_minutes` | int; how long ONE student has after they hit *Start* | minutes spinner |

> **Important UI cue:** `duration_minutes` is **not** the same as `end_time - start_time`. The window (`[start_time, end_time]`) is the period in which a student may *begin* the test. Once they begin, their personal clock is `duration_minutes`. The UI must explain this clearly — a tooltip and a worked example ("Your students can begin between 9:00 AM and 11:00 AM. Whoever starts will then have 60 minutes to finish.")

### 2.3 Step 3 — Suite generation
| Field | Constraint | UI |
|---|---|---|
| `total_suites` | int ≥ 1 | spinner; default 3 |
| `total_questions_per_suite` | int ≥ 1 | spinner |

UI-side validation: warn if the question pool is too small to fill `total_questions_per_suite` after the suite generation algorithm. The backend silently allows "less than target if no fitting items remain"; surface a preview such as "Suite 2 will likely have 9/10 slots filled — consider adding more questions or lowering the target."

### 2.4 Step 4 — Question pool
This is the heart of the editor. Show two parallel sections that the lecturer can populate freely:

**A. Standalone questions** — flat list, drag-reorderable. Each row contains:
- `body` (rich-text or plain textarea)
- `type` (radio: Objective / Fill-in / Written)
- If type is **Objective**: a sub-editor for `options[]` (label + value pairs); also `correct_answer` is the chosen option's value.
- If type is **Fill-in**: a `correct_answer` field, optional. Mark visually that fill-in **without** a correct answer is graded by AI (and only if `show_answer` is on).
- If type is **Written**: hide `correct_answer`. Show a banner "Graded by AI when answers are revealed."
- `marks` — int spinner

**B. Preambles** — accordion list. Each preamble has:
- `body` (the shared passage, rich-text)
- A nested list of sub-questions (same editor as standalone)
- Constraint: every preamble must contain at least one sub-question. The submit button should disable until satisfied.

Provide a clear visual distinction between standalone and preamble questions — colour-coded chips ("Standalone" / "Preamble #1") work well. The lecturer needs to feel that preambles are **groups**.

### 2.5 Step 5 — Result reveal
| Field | UI |
|---|---|
| `show_answer` | toggle "Reveal grading to students after the test ends" with helper text: "Off: students see only that they submitted. On: students see correct answers, marks, and AI feedback." |

### 2.6 Step 6 — Secret + review
| Field | Constraint | UI |
|---|---|---|
| `secret` | one passphrase, used by all students | password field with reveal toggle, plus "regenerate" suggesting a strong random string |

Below the secret, render a **summary card** of all stages so the lecturer can spot mistakes before submitting. On submit, call `createTest`; on success, route to the **lecturer dashboard for that test** (§4).

> **Security note for proctored types:** the secret should be communicated to students through an out-of-band channel (announced in class, displayed on a projector at start_time, etc.). The UI should explicitly tell the lecturer this — never email or post the secret in the LMS.

---

## 3. Student flow — taking the test

### 3.1 Pre-test: discovery + lobby
The student dashboard should list every test for which they are enrolled in the course, with three states:

| State | Render |
|---|---|
| `now < start_time` | "Opens at [start_time]" — disabled card + countdown |
| `start_time ≤ now ≤ end_time`, no attempt yet | "Available now — Begin" — primary CTA |
| Attempt exists & is `ON_GOING` | "Resume" — primary CTA, plus deadline countdown |
| Attempt exists & is `ENDED` | "View results" — secondary CTA, only meaningful if `show_answer === true` |
| `now > end_time`, no attempt | "Closed" — disabled |

When the student clicks **Begin**, route to a **lobby** that:
1. Shows test rules (title, duration, type, "you have one chance", expectations).
2. For proctored types: triggers the **pre-flight checks** (§5.1) before showing the secret prompt.
3. Asks for the secret. On submit, call `startTest({ testId, secret })`.

The backend will reject with one of:
- `Test has not started yet` / `Test window has closed` — re-route to dashboard
- `Invalid test secret` — show inline error, allow retry (rate-limit on UI side, e.g. 3 tries / 30 seconds)
- `Student is not enrolled in this course` — show a hard error, contact lecturer
- `Student already has an ongoing attempt for this test` — show "Resume your existing attempt" CTA

On success, the response includes the assigned `TestSuite` (with its questions and preambles). **Cache this suite locally for the duration of the attempt** — the student should never see another suite even if they refresh.

### 3.2 The test runner
This is the screen the student spends 99% of their time in. Build it around three persistent UI elements that **never disappear**:

1. **Countdown timer (top-right)** — shows `deadline - now`. Deadline is `started_at + duration_minutes + extended_minutes`. The backend can extend `extended_minutes` mid-test (`updateTestCompletionTime`), so the UI should refetch the attempt every ~30s **or** subscribe via polling on `getTestAttempt` and recompute the deadline. When the timer hits 0, immediately call `endTest` and redirect.
2. **Question palette / navigator (left or bottom)** — one cell per question, plus one cell per preamble (with a small badge of its sub-question count). Each cell shows: not visited / visited / answered / flagged. Click jumps to that question. Preambles open as one screen with all sub-questions visible together.
3. **Connection + auto-save indicator (top-left)** — pulses when a `submitAnswer` / `submitPreambleAnswers` request is in-flight; turns red on failure.

#### 3.2.1 Standalone question screen
- Render the question body, type-specific input (radio for Objective, text for Fill-in, textarea / canvas for Written), and `marks` (e.g. "5 marks") so the student can budget effort.
- After every change, debounce ~750ms and call `submitAnswer({ attemptId, questionId, selected_option | answer_text })`. The backend upserts on `(attemptId, questionId)`, so re-calls are safe.
- Buttons: Previous / Next / Flag for review. Flag is purely UI state; no backend call.

#### 3.2.2 Preamble screen
- Render the preamble body once at the top in a **distinct container** (e.g. left column or sticky banner) so it stays visible while answering.
- Render every sub-question stacked beneath it.
- **Single Submit button** at the bottom that calls `submitPreambleAnswers` with one payload covering every sub-question. Validate locally that all required sub-questions have been touched before enabling the button. The backend rejects if any `questionId` doesn't belong to the preamble — this should never happen in normal use because the UI sources IDs from the loaded preamble.
- It is OK to allow re-submitting (the call upserts atomically), but signal to the student "your last submission was saved at hh:mm:ss".

#### 3.2.3 Auto-end behaviour
The backend runs auto-end on every read or write of an attempt. The UI must therefore:
- Treat **any** mutation that returns "Attempt has ended" as a hard stop. Show a modal: "Your time is up. Your answers so far have been submitted." Then navigate away.
- Handle the race where the student submits an answer at the deadline: the call may succeed or may return ENDED. UI must accept either gracefully.

### 3.3 End screen
Pre-test the spec rules: `endTest` is **idempotent**, so calling it from the navigation guard (when the user clicks "Submit") and again from the timer expiration is safe. Always call it on the way out.

The end screen has two modes based on `test.show_answer`:

- **`show_answer === false`**: "Your test has been submitted. Results are not available." Disable any "view results" routing.
- **`show_answer === true`**: route to a results screen (§3.4) that polls `getTestAttempt`.

### 3.4 Results / review (`getTestAttempt`)
- Deterministic answers (Objective, Fill-in with correct_answer): show `is_correct`, `marks_awarded` immediately on first load.
- Non-deterministic answers (Written, Fill-in without correct_answer): may have `ai_feedback` and `marks_awarded` as `null` initially. The AI grading runs async on the BullMQ queue. The UI should **poll** `getTestAttempt` every 5–10 seconds while any answer has null grading fields, with a visible "Grading… 3 of 5 done" indicator. Stop polling when all answers are populated or after a timeout (e.g. 5 minutes), at which point show a message "Grading is taking longer than expected — check back later."

> When the backend hides answer fields (`show_answer=false`), it sets `is_correct`, `marks_awarded`, `ai_feedback` to `null` on the response. The UI **should not** branch on the flag itself — it should branch on whether the fields are populated. This means the same components work in both modes.

---

## 4. Lecturer flow — running + admin

### 4.1 Test detail / dashboard
After `createTest` (or by clicking through from a list), show:

- **Stats strip**: total enrolled students, # not started, # ongoing, # ended, average score (when available).
- **Live attempt table** (`listTestAttempts`):
  - Columns: Student, Class, Suite assigned, Started at, Time remaining (computed), State, Score (if ended), Actions.
  - Filter chips: by `state`, by `suiteId`. Map to the `ListTestAttemptsFilterInput` filter.
  - Refresh every 15–30 seconds while any attempt is `ON_GOING`.
- **Bulk action: extend time** (`updateTestCompletionTime`):
  - Three modes per the input shape:
    - Default (no targeting) — extend everyone with an ON_GOING attempt for this test.
    - Class-scoped — pick a class, extend only those students.
    - Manual select — checkbox-select rows in the table, extend only those.
  - The UI must enforce mutual exclusion: if any rows are checked, the class picker is disabled, and vice versa. The backend will also reject mixing.
  - Always require a positive `additional_minutes`. After success, refresh the table — the new deadline reflects on student devices on their next poll.

### 4.2 Per-attempt drill-down
Lecturer can click any row to open `getTestAttempt` for that attempt. This screen is the same component as the student review screen (§3.4) but always with `show_answer` semantics enabled (lecturer is allowed to see grading regardless of the test flag).

---

## 5. Proctored mode — security measures

These apply when `test.type` is one of `CLASS_TEST`, `MID_SEMESTER`, `END_OF_SEMESTER_EXAM`. Every measure here has a tradeoff between false positives, accessibility, and effort. Pick the level appropriate to the stakes.

### 5.1 Pre-flight checks (lobby)
Run these before letting the student call `startTest`. Block start if any fail.

| Check | What it does | Implementation |
|---|---|---|
| **Browser capability** | Reject very old browsers, mobile/desktop divergence | feature-detect (Fullscreen API, Page Visibility API, BroadcastChannel) |
| **Network sanity** | Make sure the student can hit the API | timed health check with a real GraphQL query |
| **Single tab/session** | No other test tab open | `BroadcastChannel('exam-runtime')` ping; if any other tab responds, abort |
| **Identity confirmation** | Force a webcam selfie + agreement | capture image, store on attempt metadata (server-side endpoint not in spec — add later) |
| **Fullscreen entry** | Test must run fullscreen | request `document.documentElement.requestFullscreen()`; if user denies, block start |
| **Lockdown announcement** | Tell user what is monitored and what is forbidden | modal with explicit list, check-box "I understand" |

### 5.2 In-test enforcement
Trigger lightweight events to the backend (or accumulate locally and flush on `endTest`). For now, since the backend has no event API yet, accumulate locally and surface in the UI.

| Behaviour | Detection | Response |
|---|---|---|
| Tab/window blur | `document.visibilitychange` (state=hidden), `window.blur` | start a 5–10s grace timer; if focus doesn't return, log as an incident, show a red overlay "Return to the test now" |
| Fullscreen exit | `document.fullscreenchange` (no element) | identical to blur — modal forces re-enter or auto-`endTest` after N seconds |
| Right-click | `contextmenu` event + `preventDefault` | suppress |
| Copy / cut / paste on question text | `copy`/`cut`/`paste` events on question elements + `preventDefault` | suppress; flash a tooltip "copying is disabled" |
| Drag/drop of answers across questions | `dragstart` + `preventDefault` | suppress |
| Print | `Ctrl/Cmd+P` keydown | suppress; show toast |
| DevTools (heuristic only) | timing trick: measure `debugger` statement delay | **not reliable** — at most flag for review |
| Screenshot | not detectable in browser | accept the limitation; rely on suite shuffling instead |
| Multiple monitors / external displays | `window.screen.isExtended` (where supported) | warn at lobby; do not block (false positives common) |
| Network drop | service worker offline event | freeze the timer locally, queue submissions, retry; cap at e.g. 60s before forcing `endTest` |
| Suspicious paste of long text | textarea `paste` listener — if pasted content > N chars, log incident | log; do not block (false positives for screen readers) |
| Multiple devices for same student | server-side detection on `startTest` (already enforced — duplicate ON_GOING attempt rejected) | rely on backend |

### 5.3 Visual / structural defences
| Measure | Detail |
|---|---|
| **Random suite** (already enforced) | Backend assigns a random suite per attempt; the UI must NEVER cache another suite or expose it. |
| **Per-question shuffling of options** | At render-time, shuffle the option order for OBJECTIVE questions (deterministic on `attemptId + questionId` so a student sees the same order on refresh). Backend's `correct_answer` is matched by value, not position — safe to shuffle. |
| **No back-arrow review for high-stakes** | Optional: lock navigation to forward-only on `END_OF_SEMESTER_EXAM`. Add a per-test config later. |
| **Hidden question count from peers** | Don't show "12 of 30" prominently — this leaks suite size. Show only the navigator and a progress percentage. |
| **No printable / exportable view of the test paper** | suppress print, file save, share targets. |
| **Watermark every page** with the student's email and a session ID — discourages phone-photo cheating |
| **Activity timeline** stored on the device + flushed on submit. Lecturer review screen should later show this in a per-attempt detail panel. |

### 5.4 Identity + recording
For very high-stakes tests, integrate a webcam-based proctoring layer:

- Periodic photo snapshots every 30–60s, stored to S3 (use the existing `UploadModule` later).
- Continuous local face-detection (MediaPipe or face-api.js) with telemetry: "no face detected for >10s", "multiple faces detected".
- Optional audio level monitoring — flag silence breaks (talking).

Important constraints:
- These features require **explicit consent** at lobby time. Any rejection must block start.
- Snapshots are sensitive PII. Treat with retention rules (delete N days after grading).
- Local face-detection is best-effort and full of false positives — surface as **lecturer review hints**, not auto-fail signals.

### 5.5 Server-side hardening (suggested for a future API change)
The current backend does not yet have endpoints for these, but the UI design should accommodate them:

- Per-attempt **incident log** endpoint (`recordIncident(attemptId, kind, payload)`).
- Heartbeat endpoint to detect dead clients (e.g. closed laptop). On extended silence, lecturer dashboard marks the attempt as "stalled".
- IP / geolocation logging on `startTest` and key submissions.

---

## 6. Unproctored mode (`NORMAL_TEST`)

The author selects `NORMAL_TEST` for revision/learning. The UI should be **noticeably calmer**:

| Concern | Proctored | Unproctored |
|---|---|---|
| Fullscreen | enforced | not required |
| Tab switch | logged + warning | allowed silently |
| Right-click / copy | blocked | allowed |
| Webcam | required | not requested |
| Per-question reveal | none until end | allow optional "Show explanation" after each answered question (only if `show_answer=true`) |
| Navigation | strict forward | free, with a question palette |
| Time | strict | strict, but reset / retake should be possible (backend allows multiple attempts naturally — there's no uniqueness across `(student, test)` for ENDED attempts) |
| Retake | prevented (one ON_GOING max, one ENDED total enforced by lecturer-only) | "Try again" button — calls `startTest` again, which the backend permits if no ON_GOING exists |
| Hint system | none | optional; can show first-letter hints for fill-in questions, eliminate-2 for objective. Implement client-side; the backend doesn't support it directly. |
| Progress save | implicit | explicit "Save and continue later" — `endTest` is **not** called, attempt remains ON_GOING; student returns via "Resume" |

> The same `<TestRunner>` component should serve both modes. Wire its behaviour off the parent test's `type` field, with a single boolean `isProctored = type !== NORMAL_TEST`.

---

## 7. Component map (suggested)

A clean component decomposition that mirrors the backend:

```
<ExamLayout>
  <TestList>                      // student dashboard (list)
  <TestCard>                      // one row in the list (covers all states)
  <TestLobby>                     // pre-flight + secret entry
    <PreflightCheck>              // proctored only
    <SecretPrompt>
  <TestRunner>                    // the live attempt screen
    <Timer>
    <ConnectionIndicator>
    <QuestionPalette>
    <StandaloneQuestion>          // wraps Objective / FillIn / Written
      <ObjectiveAnswer>
      <FillInAnswer>
      <WrittenAnswer>             // textarea + optional canvas
    <PreamblePanel>               // sticky body + grouped sub-questions
    <SubmitConfirm>
    <ProctorOverlay>              // proctored only — focus loss, fullscreen exit etc.
  <ResultsView>                   // post-end review
    <DeterministicResultRow>
    <NonDeterministicResultRow>   // poll for AI feedback

<LecturerLayout>
  <TestAuthorWizard>              // §2 wizard
  <TestDashboard>
    <AttemptTable>                // listTestAttempts
    <ExtendTimeDialog>            // updateTestCompletionTime, three modes
  <AttemptDetail>                 // reuses ResultsView with lecturer-grants
```

---

## 8. Cross-cutting requirements

- **Optimistic UI**: never wait for `submitAnswer` to mark a question as answered. Show "saved" once the call resolves; on error, revert and show inline error.
- **Idempotency-aware retries**: the answer mutations and `endTest` are safe to retry. Build a retry layer in the network client that backs off on transient errors.
- **Strong empty / error states** for: no enrolled tests, no questions in suite (rare, but possible if author misconfigures), session expired, network down for >60s.
- **Accessibility**: timer with both visual and `aria-live` updates; no keyboard traps inside the proctor overlay; question text supports screen readers; written answers respect OS-level font scaling.
- **i18n-ready**: all proctor warnings and rule text must be translatable from day one — short, declarative copy.
- **Telemetry-by-default**: log at minimum: lobby start, suite assigned, every submit, end reason (manual, timer, auto-end), every proctor incident. Buffer client-side; flush on `endTest`.

---

## 9. What the backend currently does NOT cover

These are deliberate gaps to keep the spec minimal. Design the UI as if they exist (with TODO placeholders) and surface them to backend later.

- Per-attempt incident logging (proctored events).
- Webcam snapshot upload tied to an attempt.
- Question-level hints, explanations, or post-answer reveals.
- Lecturer override of an individual answer's grading.
- Bulk re-grade after an answer-key correction.
- Student-facing test catalogue with previews.
- Attempt history (prior `NORMAL_TEST` attempts) for a student.

If any of these block your UI design, raise them; they likely require a small backend addition.
