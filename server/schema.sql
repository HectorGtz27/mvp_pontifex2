-- Pontifex Database Schema
-- Run this in pgAdmin or psql against the "Pontifex" database

-- 1. Document types
CREATE TABLE IF NOT EXISTS document_types (
  id VARCHAR(50) PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  required BOOLEAN DEFAULT TRUE
);

-- 2. Applications (solicitudes)
CREATE TABLE IF NOT EXISTS applications (
  id VARCHAR(30) PRIMARY KEY,
  applicant VARCHAR(200) NOT NULL,
  requested_amount NUMERIC(15, 2) NOT NULL,
  term_months INTEGER NOT NULL,
  purpose TEXT,
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  organization_type VARCHAR(100),
  notes TEXT,
  submitted_at DATE DEFAULT CURRENT_DATE,
  documents_total INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  documents_validated INTEGER DEFAULT 0,
  documents_pending_review INTEGER DEFAULT 0
);

-- 3. Extracted fields (from OCR on documents)
CREATE TABLE IF NOT EXISTS extracted_fields (
  id SERIAL PRIMARY KEY,
  application_id VARCHAR(30) REFERENCES applications(id) ON DELETE CASCADE,
  document_type VARCHAR(50),
  file_name VARCHAR(200),
  field_name VARCHAR(100) NOT NULL,
  field_value VARCHAR(200),
  source VARCHAR(100),
  valid BOOLEAN DEFAULT TRUE,
  confidence NUMERIC(4, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending'  -- pending | validated | needs_review
);

-- 4. Extracted spreadsheet data
CREATE TABLE IF NOT EXISTS extracted_spreadsheet (
  id SERIAL PRIMARY KEY,
  application_id VARCHAR(30) REFERENCES applications(id) ON DELETE CASCADE,
  documento VARCHAR(200),
  campo VARCHAR(100),
  valor VARCHAR(200),
  fuente VARCHAR(100)
);

-- 5. Credit score
CREATE TABLE IF NOT EXISTS credit_scores (
  id SERIAL PRIMARY KEY,
  application_id VARCHAR(30) REFERENCES applications(id) ON DELETE CASCADE,
  grade CHAR(1) NOT NULL,             -- A | B | C | D
  grade_label VARCHAR(50),
  composite INTEGER,
  bureau_score INTEGER,
  bureau_band VARCHAR(100)
);

-- 6. Score breakdown components
CREATE TABLE IF NOT EXISTS score_breakdown (
  id SERIAL PRIMARY KEY,
  credit_score_id INTEGER REFERENCES credit_scores(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  weight INTEGER,
  score INTEGER,
  max_score INTEGER DEFAULT 100,
  status VARCHAR(20) DEFAULT 'ok'
);

-- 7. KPIs (indicadores financieros)
CREATE TABLE IF NOT EXISTS kpis (
  id SERIAL PRIMARY KEY,
  application_id VARCHAR(30) REFERENCES applications(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  value NUMERIC(15, 4),
  format VARCHAR(20),                 -- null | 'percent'
  benchmark VARCHAR(30),
  status VARCHAR(20) DEFAULT 'ok'
);

-- 8. Credit recommendation
CREATE TABLE IF NOT EXISTS recommendations (
  id SERIAL PRIMARY KEY,
  application_id VARCHAR(30) REFERENCES applications(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL,        -- approve | approve_conditional | reject
  suggested_amount NUMERIC(15, 2),
  suggested_term_months INTEGER,
  suggested_rate VARCHAR(50),
  analyst_notes TEXT
);

-- 9. Recommendation conditions
CREATE TABLE IF NOT EXISTS recommendation_conditions (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER REFERENCES recommendations(id) ON DELETE CASCADE,
  condition_text TEXT NOT NULL
);

-- 10. Credits (post-disbursement)
CREATE TABLE IF NOT EXISTS credits (
  id VARCHAR(30) PRIMARY KEY,
  applicant VARCHAR(200) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  disbursed_at DATE,
  term_months INTEGER,
  balance NUMERIC(15, 2),
  grade_at_disbursement CHAR(1)
);

-- 11. Covenants for each credit
CREATE TABLE IF NOT EXISTS covenants (
  id SERIAL PRIMARY KEY,
  credit_id VARCHAR(30) REFERENCES credits(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  current_value NUMERIC(15, 4),
  threshold NUMERIC(15, 4),
  status VARCHAR(10) DEFAULT 'green', -- green | yellow | red
  trigger_rule TEXT
);

-- 12. Credit alerts
CREATE TABLE IF NOT EXISTS credit_alerts (
  id SERIAL PRIMARY KEY,
  credit_id VARCHAR(30) REFERENCES credits(id) ON DELETE CASCADE,
  alert_type VARCHAR(10) NOT NULL,    -- red | yellow
  alert_text TEXT NOT NULL
);
