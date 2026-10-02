-- Quantum Nexus — PLANNED production schema (PostgreSQL 15+ with pgvector).
--
-- STATUS: written, NOT deployed. The current build stores this same
-- information in the learner's browser (see lib/storage.ts). Each table below
-- names the part of that saved state it would replace, so moving to a database
-- is a change of storage, not a redesign.
--
-- To try it:  createdb quantum_nexus && psql quantum_nexus -f schema.sql

CREATE EXTENSION IF NOT EXISTS vector;

-- Profile -------------------------------------------------------------------
CREATE TABLE students (
    id              TEXT PRIMARY KEY,                 -- Profile.id
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('learner', 'educator')),
    language        TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi')),
    inferred_level  TEXT NOT NULL DEFAULT 'BEGINNER'
                    CHECK (inferred_level IN ('BEGINNER', 'DEVELOPING', 'PROFICIENT', 'ADVANCED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Curriculum (data/curriculum.ts, data/concepts.ts) ---------------------------
CREATE TABLE concepts (
    id          TEXT PRIMARY KEY,                     -- 'qubit', 'gates', 'superposition', 'entanglement'
    module_no   TEXT NOT NULL,
    title       TEXT NOT NULL,
    position    INT  NOT NULL,
    version     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'published',
    verified    BOOLEAN NOT NULL DEFAULT false,
    updated_at  DATE NOT NULL
);

-- Stage-by-stage progress (AppState.concepts[topic].scores / attempts / timeMs)
CREATE TABLE stage_progress (
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id  TEXT NOT NULL REFERENCES concepts(id),
    stage       TEXT NOT NULL CHECK (stage IN (
                    'discover', 'learn', 'watch', 'interact', 'experiment', 'ask', 'predict',
                    'run', 'observe', 'explain', 'assess', 'review', 'challenge')),
    score       INT  NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
    attempts    INT  NOT NULL DEFAULT 0,
    time_ms     BIGINT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, concept_id, stage)
);

CREATE TABLE concept_mastery (
    student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id   TEXT NOT NULL REFERENCES concepts(id),
    mastered_at  TIMESTAMPTZ,                          -- ConceptProgress.masteredAt
    last_stage   TEXT,
    PRIMARY KEY (student_id, concept_id)
);

-- Events (AppState.events) ----------------------------------------------------
CREATE TABLE learning_events (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,                         -- e.g. 'stageCompleted', 'predictionSubmitted'
    concept_id  TEXT REFERENCES concepts(id),
    detail      TEXT,
    meta        JSONB NOT NULL DEFAULT '{}',
    at          TIMESTAMPTZ NOT NULL
);
CREATE INDEX learning_events_student_time ON learning_events (student_id, at DESC);

-- Predictions and simulation runs (AppState.predictions, AppState.runs) --------
CREATE TABLE predictions (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id  TEXT NOT NULL REFERENCES concepts(id),
    source      TEXT NOT NULL CHECK (source IN ('lab', 'practice', 'lesson', 'challenge')),
    circuit     TEXT NOT NULL,
    predicted   TEXT NOT NULL,
    actual      TEXT NOT NULL,
    correct     BOOLEAN NOT NULL,
    confidence  TEXT CHECK (confidence IN ('low', 'medium', 'high')),
    at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE simulation_runs (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    circuit     TEXT NOT NULL,
    shots       INT  NOT NULL CHECK (shots BETWEEN 1 AND 8192),
    counts      JSONB NOT NULL,
    backend     TEXT NOT NULL CHECK (backend IN ('browser', 'qiskit')),
    at          TIMESTAMPTZ NOT NULL
);

-- Explanations (AppState.explanations) ------------------------------------------
CREATE TABLE explanations (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id      TEXT NOT NULL REFERENCES concepts(id),
    rubric_id       TEXT NOT NULL,
    mode            TEXT NOT NULL CHECK (mode IN ('written', 'structured')),
    text            TEXT NOT NULL,
    score           INT  NOT NULL CHECK (score BETWEEN 0 AND 100),
    covered         TEXT[] NOT NULL DEFAULT '{}',
    missing         TEXT[] NOT NULL DEFAULT '{}',
    at              TIMESTAMPTZ NOT NULL
);

-- Mastery checks (AppState.assessments, ConceptProgress.assess) -----------------
CREATE TABLE assessment_attempts (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id  TEXT NOT NULL REFERENCES concepts(id),
    kind        TEXT NOT NULL CHECK (kind IN ('full', 'targeted')),
    score       NUMERIC(5, 2) NOT NULL,
    total       INT NOT NULL,
    answers     JSONB NOT NULL,
    at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE assessment_items (
    student_id    TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id    TEXT NOT NULL REFERENCES concepts(id),
    slot          TEXT NOT NULL,                       -- e.g. 'Interference', 'build', 'write'
    credit        NUMERIC(3, 2) NOT NULL,
    first_credit  NUMERIC(3, 2) NOT NULL,
    tries         INT NOT NULL DEFAULT 1,
    updated_at    TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (student_id, concept_id, slot)
);

-- Misconceptions (AppState.misconceptions) ---------------------------------------
CREATE TABLE misconception_records (
    id             TEXT PRIMARY KEY,
    student_id     TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    misconception  TEXT NOT NULL,                      -- e.g. 'classical_randomness'
    concept_id     TEXT NOT NULL REFERENCES concepts(id),
    confidence     NUMERIC(3, 2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    source         TEXT NOT NULL CHECK (source IN ('explanation', 'tutor', 'assessment', 'prediction')),
    evidence       TEXT NOT NULL,
    at             TIMESTAMPTZ NOT NULL,
    resolved_at    TIMESTAMPTZ
);

-- Tutor (AppState.tutorLog) and its knowledge base (data/knowledge.ts) ------------
CREATE TABLE tutor_interactions (
    id          TEXT PRIMARY KEY,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id  TEXT REFERENCES concepts(id),
    stage       TEXT,
    mode        TEXT NOT NULL,                         -- e.g. 'HINT', 'RESULT_ANALYSIS'
    question    TEXT NOT NULL,
    sources     TEXT[] NOT NULL DEFAULT '{}',
    at          TIMESTAMPTZ NOT NULL
);

CREATE TABLE knowledge_chunks (
    id          TEXT PRIMARY KEY,                      -- KnowledgeEntry.id
    concept_id  TEXT REFERENCES concepts(id),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    reference   TEXT NOT NULL,                         -- where in the product it is taught
    version     TEXT NOT NULL,
    verified    BOOLEAN NOT NULL DEFAULT false,
    updated_at  DATE NOT NULL,
    embedding   vector(768)                            -- filled by the future embedding job
);
-- CREATE INDEX knowledge_chunks_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Spaced review (AppState.reviews) ------------------------------------------------
CREATE TABLE review_schedule (
    student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    concept_id        TEXT NOT NULL REFERENCES concepts(id),
    last_at           TIMESTAMPTZ,
    streak            INT NOT NULL DEFAULT 0,
    needs_review      BOOLEAN NOT NULL DEFAULT false,
    last_question_id  TEXT,
    PRIMARY KEY (student_id, concept_id)
);

-- Settings (AppState.settings) ------------------------------------------------------
CREATE TABLE student_settings (
    student_id         TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    mastery_threshold  INT NOT NULL DEFAULT 90 CHECK (mastery_threshold BETWEEN 90 AND 100),
    advanced_mode      BOOLEAN NOT NULL DEFAULT false,
    shots              INT NOT NULL DEFAULT 1024,
    backend            TEXT NOT NULL DEFAULT 'browser' CHECK (backend IN ('browser', 'qiskit'))
);
