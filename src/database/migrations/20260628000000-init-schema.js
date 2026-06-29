'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryInterface.sequelize.query(`
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(180) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  email_verified_at TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX users_status_idx ON users(status);

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, role_id)
);
CREATE TABLE role_permissions (
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  replaced_by_token_id UUID NULL,
  user_agent VARCHAR(255) NULL,
  ip_address VARCHAR(80) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens(expires_at);
CREATE TABLE auth_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(180) NOT NULL,
  pin_hash VARCHAR(128) NOT NULL,
  purpose VARCHAR(40) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX auth_pins_email_purpose_idx ON auth_pins(lower(email), purpose, expires_at);

CREATE TABLE patient_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NULL,
  birth_date DATE NULL,
  country VARCHAR(80) NULL,
  city VARCHAR(120) NULL,
  occupation VARCHAR(120) NULL,
  profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  avatar_file_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE therapist_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NULL,
  title VARCHAR(140) NOT NULL,
  main_specialty VARCHAR(180) NOT NULL,
  bio TEXT NULL,
  personal_phrase TEXT NULL,
  youtube_url VARCHAR(500) NULL,
  license_number VARCHAR(80) NULL,
  country VARCHAR(80) NULL,
  city VARCHAR(120) NULL,
  base_session_price NUMERIC(12,2) NULL CHECK (base_session_price IS NULL OR base_session_price >= 0),
  approval_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  avatar_file_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX therapist_profiles_approval_idx ON therapist_profiles(approval_status);
CREATE TABLE admin_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(40) NULL,
  level VARCHAR(40) NOT NULL DEFAULT 'STANDARD',
  linked_therapist_user_id UUID NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE therapy_approaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  image_file_id UUID NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX therapy_approaches_status_idx ON therapy_approaches(status);
CREATE TABLE therapy_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  approach_id UUID NOT NULL REFERENCES therapy_approaches(id),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT NULL,
  duration_minutes INTEGER NOT NULL CHECK(duration_minutes BETWEEN 15 AND 240),
  price NUMERIC(12,2) NOT NULL CHECK(price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  image_file_id UUID NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX therapy_products_approach_status_idx ON therapy_products(approach_id, status);
CREATE TABLE therapist_approaches (
  therapist_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approach_id UUID NOT NULL REFERENCES therapy_approaches(id) ON DELETE CASCADE,
  PRIMARY KEY(therapist_user_id, approach_id)
);
CREATE TABLE therapist_products (
  therapist_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES therapy_products(id) ON DELETE CASCADE,
  custom_price NUMERIC(12,2) NULL CHECK(custom_price IS NULL OR custom_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  PRIMARY KEY(therapist_user_id, product_id)
);

CREATE TABLE therapist_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK(end_time > start_time),
  CHECK(effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX therapist_schedules_lookup_idx ON therapist_schedules(therapist_user_id, weekday, status);
CREATE TABLE therapist_blocked_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  therapist_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK(end_at > start_at)
);
CREATE INDEX therapist_blocked_times_lookup_idx ON therapist_blocked_times(therapist_user_id, start_at, end_at);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_user_id UUID NOT NULL REFERENCES users(id),
  therapist_user_id UUID NOT NULL REFERENCES users(id),
  product_id UUID NOT NULL REFERENCES therapy_products(id),
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
  price NUMERIC(12,2) NOT NULL CHECK(price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  notes_for_therapist TEXT NULL,
  admin_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  CHECK(scheduled_end_at > scheduled_start_at)
);
CREATE INDEX appointments_patient_time_idx ON appointments(patient_user_id, scheduled_start_at);
CREATE INDEX appointments_therapist_time_idx ON appointments(therapist_user_id, scheduled_start_at);
CREATE INDEX appointments_status_time_idx ON appointments(status, scheduled_start_at);
CREATE UNIQUE INDEX appointments_therapist_slot_active_uq ON appointments(therapist_user_id, scheduled_start_at)
  WHERE deleted_at IS NULL AND status IN ('REQUESTED','CONFIRMED');
CREATE TABLE appointment_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  from_status VARCHAR(50) NULL,
  to_status VARCHAR(50) NOT NULL,
  changed_by_user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX appointment_status_history_appointment_idx ON appointment_status_history(appointment_id, created_at);
CREATE TABLE appointment_details (
  appointment_id UUID PRIMARY KEY REFERENCES appointments(id) ON DELETE CASCADE,
  meeting_url VARCHAR(500) NULL,
  location VARCHAR(255) NULL,
  private_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  module VARCHAR(60) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id UUID NULL,
  storage_provider VARCHAR(40) NOT NULL DEFAULT 'LOCAL',
  bucket VARCHAR(120) NULL,
  object_key VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
  checksum VARCHAR(128) NULL,
  visibility VARCHAR(40) NOT NULL DEFAULT 'PRIVATE',
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX files_owner_module_idx ON files(owner_user_id, module, entity_type, entity_id);
CREATE TABLE file_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  actor_user_id UUID NULL REFERENCES users(id),
  action VARCHAR(40) NOT NULL,
  ip_address VARCHAR(80) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cms_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  seo_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX cms_pages_status_idx ON cms_pages(status);
CREATE TABLE cms_elements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  type VARCHAR(40) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_id UUID NULL REFERENCES files(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX cms_elements_page_idx ON cms_elements(page_id, sort_order);

CREATE TABLE account_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES account_groups(id),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  normal_balance VARCHAR(10) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE INDEX accounts_group_idx ON accounts(group_id, status);
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE accounting_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(100) NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'POSTED',
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE accounting_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES accounting_transactions(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  cost_center_id UUID NULL REFERENCES cost_centers(id),
  debit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(debit >= 0),
  credit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX accounting_entries_tx_idx ON accounting_entries(transaction_id);
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NULL REFERENCES appointments(id),
  product_id UUID NULL REFERENCES therapy_products(id),
  patient_user_id UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK(amount >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BOB',
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  provider VARCHAR(40) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK(amount >= 0),
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  provider_reference VARCHAR(160) NULL,
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE SCHEMA IF NOT EXISTS mensajeria;

CREATE TABLE mensajeria.mensaje_outbox (
  id_mensaje BIGSERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'EMAIL',
  prioridad SMALLINT NOT NULL DEFAULT 5,
  para TEXT NOT NULL,
  template_key TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 6,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ NULL
);
CREATE INDEX ix_outbox_estado_next_run ON mensajeria.mensaje_outbox(estado, next_run_at);
CREATE INDEX ix_outbox_locked ON mensajeria.mensaje_outbox(locked_at);

CREATE TABLE mensajeria.mensaje_envio_log (
  id_log BIGSERIAL PRIMARY KEY,
  id_mensaje BIGINT NOT NULL REFERENCES mensajeria.mensaje_outbox(id_mensaje) ON DELETE CASCADE,
  ok BOOLEAN NOT NULL,
  provider_id TEXT NULL,
  respuesta JSONB NULL,
  error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NULL,
  before JSONB NULL,
  after JSONB NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_time_idx ON audit_logs(actor_user_id, created_at);
CREATE TABLE public_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  path VARCHAR(500) NOT NULL,
  ip_hash VARCHAR(128) NULL,
  user_agent_hash VARCHAR(128) NULL,
  referrer VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE ui_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id VARCHAR(120) NULL,
  event_name VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
DROP TABLE IF EXISTS ui_events;
DROP TABLE IF EXISTS public_visits;
DROP TABLE IF EXISTS audit_logs;
DROP FUNCTION IF EXISTS mensajeria.fn_lock_next_outbox_batch(integer, text) CASCADE;
DROP FUNCTION IF EXISTS mensajeria.fn_lock_next_outbox_batch(integer) CASCADE;
DROP TABLE IF EXISTS mensajeria.mensaje_envio_log CASCADE;
DROP TABLE IF EXISTS mensajeria.mensaje_outbox CASCADE;
DROP SCHEMA IF EXISTS mensajeria CASCADE;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS accounting_entries;
DROP TABLE IF EXISTS accounting_transactions;
DROP TABLE IF EXISTS cost_centers;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS account_groups;
DROP TABLE IF EXISTS cms_elements;
DROP TABLE IF EXISTS cms_pages;
DROP TABLE IF EXISTS file_access_logs;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS appointment_details;
DROP TABLE IF EXISTS appointment_status_history;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS therapist_blocked_times;
DROP TABLE IF EXISTS therapist_schedules;
DROP TABLE IF EXISTS therapist_products;
DROP TABLE IF EXISTS therapist_approaches;
DROP TABLE IF EXISTS therapy_products;
DROP TABLE IF EXISTS therapy_approaches;
DROP TABLE IF EXISTS admin_profiles;
DROP TABLE IF EXISTS therapist_profiles;
DROP TABLE IF EXISTS patient_profiles;
DROP TABLE IF EXISTS auth_pins;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
`);
  }
};
