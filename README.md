# Quantum Nexus — From Confusion to Quantum Clarity

**AI-Assisted Interactive Quantum Learning Platform**
Smart India Hackathon 2026 · Problem statement **26140** — *AI-Based Interactive Quantum Algorithm Learning Platform* · Theme: Smart Education · Software category

Quantum Nexus teaches quantum computing to complete beginners through one guided loop: you **predict** what a circuit will do, **run** it, **observe** the real result, and **explain** why it happened — and each step opens only when the one before it is mastered.

---

## The problem

Beginners meet quantum computing as a wall of mathematics. Most existing resources either explain (courses, videos) or let you play (circuit simulators), but leave the learner to connect the two — and nobody notices when a learner walks away with a wrong idea such as "superposition is just a hidden coin flip".

## The solution

One learning loop, the same for every concept, in 13 stages:

| #  | Stage          | What the learner does                                         | How it is scored                         |
| -- | -------------- | ------------------------------------------------------------- | ---------------------------------------- |
| 00 | Discover       | Sees what the concept is and why it matters                   | Done when started                        |
| 01 | Learn          | Reads short theory blocks (optional "Go deeper" mathematics)  | Share of blocks read                     |
| 02 | Watch          | Plays a visual lesson with play, pause and seek               | Share of scenes watched                  |
| 03 | Interact       | Uses an interactive demonstration                             | Uses of the controls                     |
| 04 | Experiment     | Reaches goals in a live state sandbox with a Bloch sphere     | Share of goals reached (checked by simulation) |
| 05 | Ask AI         | Asks the tutor a question                                     | At least one question                    |
| 06 | Predict        | Commits to a prediction and a confidence                      | Done when committed                      |
| 07 | Run            | Runs the circuit (shots, counts)                              | Done when executed                       |
| 08 | Observe        | Reads the result and answers two checks about it              | Share of checks answered correctly       |
| 09 | Explain        | Explains the result in their own words                        | Key ideas present (rubric)               |
| 10 | Assess         | Adaptive mastery check: questions + build a circuit + write   | Share of items demonstrated              |
| 11 | Review         | Reads a review built from their own mistakes                  | Done when read                           |
| 12 | Next Challenge | Solves a challenge chosen for their weakest area              | Solved or not                            |

**The 90% rule.** A stage unlocks only when the stage before it reaches **90%**. 89% stays locked; 90% and 95% unlock; 100% is complete. Locked stages stay visible but cannot be opened by clicking, by typing an address, or by any action in the code (`lib/stages.ts`, enforced again in `lib/actions.ts`). When all 13 stages pass, the concept is **mastered** and the next concept unlocks.

**One prerequisite check, no level questionnaire.** Onboarding asks how comfortable the learner is with Python and recommends the short Python Foundations warm-up to beginners (it never blocks anything). The learner's quantum level (Beginner / Developing / Proficient / Advanced) is never asked: it is inferred from what they do and is used to choose question difficulty.

## What is in this build

- **4 interactive concepts**: Qubit Fundamentals, Quantum Gates, Superposition & Measurement, Entanglement (4 more modules are on the roadmap and shown as locked).
- **Quantum Lab**: 1–3 qubits; gates H, X, Y, Z, S, T, CX, CZ, SWAP, plus RX, RY, RZ and Toffoli in advanced mode; configurable shots; a rotatable Bloch sphere that updates as you build.
- **Multiple quantum SDKs**: every circuit is written out as **Qiskit**, **Cirq**, **PennyLane** and **OpenQASM 2.0** code from one registry (`lib/circuitExport.ts`); adding an SDK is one entry. The generated programs were run against qiskit 2.5 / qiskit-aer 0.17, cirq-core 1.7 and pennylane 0.45.
- **Collaboration**: *Share circuit* copies a link that opens the same circuit in someone else's lab. Learners *Share with your instructor* from the Progress page: a report code or file holding scores and counts, never their written answers.
- **Instructor dashboard**: add learners' shared reports to see each learner's stage-by-stage scores, accuracy, weak areas and possible misconceptions, plus class-level weak areas, stage friction and rule-based next steps. A labelled sample cohort can be switched on or off.
- **AI Tutor**: answers from a verified knowledge base, lists its sources, and uses your stage, level, last experiment and detected misconceptions. Quick actions: Explain simply · Give me a hint · Why? · Show the math · Visualize this · Explain my result · Challenge me · Review my mistake.
- **Explanation scoring**, **misconception detection** (9 catalogued), **adaptive mastery checks** with targeted retries, **personalised review**, **targeted challenges**, **spaced Quick Review**.
- **Dashboard** (where you are, next action, weak areas), **Progress**, **Settings** (with live system checks), **References**, **Architecture**.
- **English and Hinglish**, a **Demo learner**, and a **reset** button.

---

## Run it on your computer

You need **Node.js 20.9 or newer**. Nothing else — no accounts, no API keys, no database.

### Step 1 — Check Node.js

- **WHERE:** a terminal (macOS: Terminal · Windows: PowerShell).
- **WHAT:** `node --version`
- **WHAT IT DOES:** shows which Node.js you have.
- **WHAT YOU SHOULD SEE:** `v20.9.0` or a higher number.
- **IF IT FAILS:** "command not found" → install the LTS version from <https://nodejs.org>, then close and reopen the terminal.

### Step 2 — Install

- **WHERE:** the terminal, inside the project folder (the one that contains `package.json`).
- **WHAT:** `npm install`
- **WHAT IT DOES:** downloads the libraries the project uses into a `node_modules` folder.
- **WHAT YOU SHOULD SEE:** a line like `added … packages`, with no red `ERR!` lines.
- **IF IT FAILS:** check you are in the right folder (`ls` or `dir` should list `package.json`). On a network error, run it again.

### Step 3 — Start

- **WHERE:** the same terminal.
- **WHAT:** `npm run dev`
- **WHAT IT DOES:** starts the site on your computer.
- **WHAT YOU SHOULD SEE:** `Local: http://localhost:3000` and `Ready`.
- **IF IT FAILS:** "port 3000 is in use" → run `npm run dev -- -p 3001` and use that number in the next step.

### Step 4 — Open

- **WHERE:** your web browser.
- **WHAT:** go to <http://localhost:3000>
- **WHAT YOU SHOULD SEE:** the Quantum Nexus home page with a live "predict, then run" circuit.
- **IF IT FAILS:** make sure the terminal from Step 3 is still open and shows `Ready`.

To stop the site, click the terminal and press **Ctrl + C**.

## Check that everything works

| Command             | What it does                                                             | What you should see            |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------ |
| `npm test`          | ~600 checks: simulator, 90% gate, locked stages, full journey, tutor, retrieval, misconceptions, persistence, security scan | `… checks passed, 0 failed.`   |
| `npm run typecheck` | Checks every TypeScript file                                             | no output                      |
| `npm run lint`      | Code-quality rules                                                       | no errors                      |
| `npm run build`     | Builds the production site                                               | a list of routes, no errors    |

With the site running you can also open <http://localhost:3000/api/health>: it runs real self-tests and answers `{"success": true, …}`.

## A 3-minute demo

1. Home page → make a prediction on the live circuit and run it.
2. **Enter → Use Demo Learner** ("Raaj" has mastered two concepts and is on Superposition, stage 06 Predict). Demo records are always labelled DEMO DATA.
3. **Dashboard**: current concept and stage, next action, an open "possible misconception", a Quick Review, system status.
4. **Continue Learning** → predict, run, observe, then explain in your own words. Click a locked stage to see the message that explains what unlocks it.
5. **Quantum Lab** → build a Bell pair (H, then CX), open the Qiskit and OpenQASM tabs, run it.
6. **AI Tutor** → "Explain my result" (it quotes your real counts) and "Review my mistake".
7. **Progress** → Share with your instructor → copy the code. Switch to **Continue as Educator**, paste it into **Instructor dashboard** → the learner appears in the class.
8. **Architecture** for what is built versus planned.
9. Profile menu → **Reset demo** to start clean. For a real run, choose **Continue as Learner**.

---

## Architecture

```
Browser
 ├─ Next.js 16 · React 19 · TypeScript · Tailwind CSS 4      app/ · components/
 ├─ Curriculum as data (EN + Hinglish, versioned)            data/
 ├─ Stage engine and the 90% gate                            lib/stages.ts · lib/actions.ts · lib/mastery.ts
 ├─ State-vector quantum simulator                           lib/quantumSimulator.ts
 ├─ Execution abstraction layer ─────────────┐               lib/execution.ts
 ├─ Multi-SDK export (Qiskit/Cirq/PennyLane/QASM) │          lib/circuitExport.ts
 ├─ Collaboration (circuit links, class reports)  │          lib/circuitLink.ts · lib/classroom.ts
 ├─ Retrieval-grounded tutor                 │               lib/aiTutor.ts · lib/knowledgeBase.ts
 ├─ Explanation / misconception / assessment │               lib/explanationEvaluator.ts · lib/misconceptions.ts · lib/adaptiveAssessment.ts
 ├─ Review · recommendations · inferred level│               lib/review.ts · lib/recommendationEngine.ts · lib/learnerLevel.ts
 ├─ Analytics and events                     │               lib/analytics.ts · lib/events.ts
 └─ Learning state in localStorage           │               lib/storage.ts · lib/store.ts
Server (Next.js)                             │
 └─ GET /api/health (real self-tests)        │               app/api/health · lib/health.ts
Optional, separate process                   ▼
 └─ FastAPI + Qiskit Aer:  GET /api/health · POST /api/simulate     backend/
```

To change the syllabus, edit the files in `data/` — no interface code needs to change.

## Environment variables

**None are required.** One is optional:

| Variable                     | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_QISKIT_API_URL` | Address of the optional Qiskit service. Empty = browser simulator. |

See `.env.example`. There are no secrets anywhere in this project. Never put a key or password in a variable that starts with `NEXT_PUBLIC_` — those are sent to the browser.

## Optional: run circuits on Qiskit Aer

The folder `backend/` holds a small FastAPI service that runs the same circuits on Qiskit Aer. It is optional; if it is not running, the app uses the browser simulator and says so. Step-by-step instructions are in [`backend/README.md`](backend/README.md).

## Deploying

The site deploys on Vercel as a standard Next.js project with no settings to change. Vercel does not run the Python service; without it the deployed site uses the browser simulator.

---

## Known limitations (stated plainly)

- **No LLM.** The tutor retrieves from a verified knowledge base and assembles answers by rules. It cannot answer questions outside that knowledge base, and says so when asked one.
- **Explanations are scored by rule-based concept matching**, in English and Hinglish. Unusual but correct wording can be under-scored; the learner can then use the "build it from sentences" mode.
- **Misconception detection, the learner level and recommendations are rules**, not machine learning.
- **No database, accounts or authentication.** Progress lives in one browser's localStorage. Clearing site data, or using another device, starts fresh. `backend/database/schema.sql` is a planned PostgreSQL + pgvector schema that is not deployed.
- **No real quantum hardware.** Circuits run in a simulator (browser, or optional Qiskit Aer). The lab is limited to 3 qubits and 6 steps.
- **The Qiskit service is optional and not hosted.** It was tested locally (its own test suite, and the app's execution layer calling it); it is not part of the Vercel deployment.
- **The Bloch sphere is a rotatable SVG projection**, not a WebGL / Three.js scene.
- **The Watch stage is an animated visual lesson** computed by the simulator. No recorded videos are included; the player supports a video file per concept when one is added.
- **Four concepts are built.** Modules 05–08 (algorithms such as Deutsch–Jozsa and Grover) are on the roadmap only.
- **The instructor dashboard has no live sync.** It reads reports that learners share by code or file, and keeps them in the instructor's browser. Its sample cohort is hand-written and always labelled.
- **Cirq and PennyLane are export formats.** The app generates their code; circuits themselves run in the app's simulator (or the optional Qiskit Aer service).
- **Stage scores are computed in the browser.** They cannot be skipped through the interface, but a determined user could edit their own browser storage; a production build would enforce the gate on a server.

## Roadmap

1. Server-side learning state (FastAPI + PostgreSQL) and real accounts for students and educators.
2. An LLM behind the existing retrieval step (RAG with pgvector), keeping sources and the "do not guess" rule.
3. Hosted Qiskit execution, then cloud quantum backends through the same execution layer.
4. Modules 05–08: quantum algorithms.
5. Live classes: reports synced automatically instead of shared by hand, and curriculum authoring.
6. Recorded video lessons and more languages.

## Honest positioning

Quantum Nexus does not claim to be the first quantum-learning platform. Excellent courses, exercises and simulators already exist (see the in-app **References** page). Its contribution is combining tutor guidance, prediction before every run, simulation, misconception detection, personalised remediation and mastery-gated progression in one guided workflow for beginners.

## Project structure

```
app/            pages (App Router) and the /api/health route
components/     interface components; components/journey/ holds the 13-stage flow
data/           curriculum, lessons, question bank, challenges, rubrics, misconceptions, knowledge base, references
lib/            simulator, stage engine, tutor, evaluators, analytics, storage
scripts/        the self-test (npm test)
backend/        optional FastAPI + Qiskit Aer service, its tests, and the planned database schema
```
