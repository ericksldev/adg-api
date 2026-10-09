-- Legacy manual seed (optional). Prefer automatic seed on API startup from `.env`:
--   SEED_SAAS_OWNER_* / SEED_SAAS_COMPANY_NAME (see `.env.example`).
--
-- Run only if you cannot start the API and need SQL-only bootstrap.
-- Use DB_* from `.env` for connection, e.g.:
--   psql "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}" -f scripts/seed-saas-admin.sql

WITH ids AS (
  SELECT
    '11111111-1111-1111-1111-111111111101'::uuid AS uuid_company,
    '22222222-2222-2222-2222-222222222201'::uuid AS uuid_user
)
INSERT INTO companies (
  uuid_company,
  name,
  plan_type,
  billing_cycle,
  membership_status,
  tenant_database,
  tenant_schema_version,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_company,
  'Vrete',
  'VRETE_EMPRESARIAL',
  'ANNUAL'::"enum_companies_billing_cycle",
  'ACTIVE'::"enum_companies_membership_status",
  NULL,
  0,
  true,
  NOW(),
  NOW()
FROM ids;

WITH ids AS (
  SELECT
    '11111111-1111-1111-1111-111111111101'::uuid AS uuid_company,
    '22222222-2222-2222-2222-222222222201'::uuid AS uuid_user
)
INSERT INTO users (
  uuid_user,
  uuid_company,
  id_card,
  first_name,
  last_name,
  email,
  username,
  password,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT
  uuid_user,
  uuid_company,
  '0000000000',
  'SaaS',
  'Admin',
  'saas@test.com',
  'saas.owner',
  '$2b$10$IsJEdrZ6zQ2.dmmO3Er8nOAk.mxPfXv8i0XgOr9gLIau7llgknOYi',
  'saas_owner',
  true,
  NOW(),
  NOW()
FROM ids;
