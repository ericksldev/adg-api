-- SaaS plan catalog. Idempotent.
-- plan_type is VARCHAR so catalog codes can be stored.
--
-- Commercial base catalog. Created on first deploy. Do not enter these by hand.
--   VRETE_INICIO        animals 100,  users 1, activities/year 2000
--   VRETE_CRECIMIENTO   animals 300,  users 2, activities/year 6000
--   VRETE_PROFESIONAL   animals 1500, users 3, activities/year 30000
--   VRETE_EMPRESARIAL   animals 4000, users 5, activities/year 80000
--
-- Retired codes BASIC, PREMIUM, ESSENTIAL, PROFESSIONAL and ENTERPRISE are rewritten
-- to VRETE_EMPRESARIAL on companies and company_payments. Membership dates, amounts
-- and tenant data are left as they are. Those catalog rows are then removed.
--
-- Services must not read these numbers from code. Company subscriptions keep their
-- own copied limits until the next subscription.

CREATE TABLE IF NOT EXISTS saas_plans (
    uuid_plan UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    annual_price DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_plans_code_unique ON saas_plans (code);

ALTER TABLE saas_plans ALTER COLUMN uuid_plan SET DEFAULT gen_random_uuid();
ALTER TABLE saas_plans ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE saas_plans ALTER COLUMN updated_at SET DEFAULT NOW();

CREATE TABLE IF NOT EXISTS saas_plan_limits (
    uuid_plan UUID NOT NULL REFERENCES saas_plans (uuid_plan) ON DELETE CASCADE,
    resource_code VARCHAR(64) NOT NULL,
    max_value INTEGER NOT NULL,
    CONSTRAINT saas_plan_limits_plan_resource_unique UNIQUE (uuid_plan, resource_code)
);

DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'companies'
      AND column_name = 'plan_type';

    IF col_type = 'USER-DEFINED' THEN
        ALTER TABLE companies ALTER COLUMN plan_type DROP DEFAULT;
        ALTER TABLE companies
            ALTER COLUMN plan_type TYPE VARCHAR(64)
            USING plan_type::text;
        ALTER TABLE companies ALTER COLUMN plan_type SET DEFAULT 'VRETE_EMPRESARIAL';
        ALTER TABLE companies ALTER COLUMN plan_type SET NOT NULL;
    END IF;
END $$;

DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_payments'
      AND column_name = 'plan_type';

    IF col_type = 'USER-DEFINED' THEN
        ALTER TABLE company_payments ALTER COLUMN plan_type DROP DEFAULT;
        ALTER TABLE company_payments
            ALTER COLUMN plan_type TYPE VARCHAR(64)
            USING plan_type::text;
        ALTER TABLE company_payments ALTER COLUMN plan_type SET DEFAULT 'VRETE_EMPRESARIAL';
        ALTER TABLE company_payments ALTER COLUMN plan_type SET NOT NULL;
    END IF;
END $$;

INSERT INTO saas_plans (uuid_plan, code, name, description, annual_price, currency, is_active, created_at, updated_at)
VALUES
    (gen_random_uuid(), 'VRETE_INICIO', 'Inicial', 'Initial SaaS plan.', 199.00, 'USD', TRUE, NOW(), NOW()),
    (gen_random_uuid(), 'VRETE_CRECIMIENTO', 'Evolución', 'Initial SaaS plan.', 399.00, 'USD', TRUE, NOW(), NOW()),
    (gen_random_uuid(), 'VRETE_PROFESIONAL', 'Profesional', 'Initial SaaS plan.', 749.00, 'USD', TRUE, NOW(), NOW()),
    (gen_random_uuid(), 'VRETE_EMPRESARIAL', 'Corporativo', 'Initial SaaS plan.', 999.00, 'USD', TRUE, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Rename the initial commercial names once. Later admin edits are kept.
UPDATE saas_plans SET name = 'Inicial', updated_at = NOW() WHERE code = 'VRETE_INICIO' AND name = 'Vrete Inicio';
UPDATE saas_plans SET name = 'Evolución', updated_at = NOW() WHERE code = 'VRETE_CRECIMIENTO' AND name = 'Vrete Crecimiento';
UPDATE saas_plans SET name = 'Profesional', updated_at = NOW() WHERE code = 'VRETE_PROFESIONAL' AND name = 'Vrete Profesional';
UPDATE saas_plans SET name = 'Corporativo', updated_at = NOW() WHERE code = 'VRETE_EMPRESARIAL' AND name = 'Vrete Empresarial';

-- Base limits. Inserted when missing. A later edit from plan admin is kept.
INSERT INTO saas_plan_limits (uuid_plan, resource_code, max_value)
SELECT p.uuid_plan, v.resource_code, v.max_value
FROM saas_plans p
JOIN (
    VALUES
        ('VRETE_INICIO', 'USERS', 1),
        ('VRETE_INICIO', 'ANIMALS', 100),
        ('VRETE_INICIO', 'ACTIVITY_RECORDS', 2000),
        ('VRETE_CRECIMIENTO', 'USERS', 2),
        ('VRETE_CRECIMIENTO', 'ANIMALS', 300),
        ('VRETE_CRECIMIENTO', 'ACTIVITY_RECORDS', 6000),
        ('VRETE_PROFESIONAL', 'USERS', 3),
        ('VRETE_PROFESIONAL', 'ANIMALS', 1500),
        ('VRETE_PROFESIONAL', 'ACTIVITY_RECORDS', 30000),
        ('VRETE_EMPRESARIAL', 'USERS', 5),
        ('VRETE_EMPRESARIAL', 'ANIMALS', 4000),
        ('VRETE_EMPRESARIAL', 'ACTIVITY_RECORDS', 80000)
) AS v(code, resource_code, max_value) ON p.code = v.code
ON CONFLICT (uuid_plan, resource_code) DO NOTHING;

-- Replace only the provisional seed. Subscription snapshots on companies are not updated.
UPDATE saas_plan_limits AS limit_row
SET max_value = base.max_value
FROM saas_plans AS plan
JOIN (
    VALUES
        ('VRETE_INICIO', 'USERS', 5, 1),
        ('VRETE_INICIO', 'ACTIVITY_RECORDS', 50000, 2000),
        ('VRETE_CRECIMIENTO', 'USERS', 20, 2),
        ('VRETE_CRECIMIENTO', 'ACTIVITY_RECORDS', 150000, 6000),
        ('VRETE_PROFESIONAL', 'USERS', 60, 3),
        ('VRETE_PROFESIONAL', 'ACTIVITY_RECORDS', 750000, 30000),
        ('VRETE_EMPRESARIAL', 'USERS', 120, 5),
        ('VRETE_EMPRESARIAL', 'ACTIVITY_RECORDS', 2000000, 80000)
) AS base(code, resource_code, previous_value, max_value) ON plan.code = base.code
WHERE limit_row.uuid_plan = plan.uuid_plan
  AND limit_row.resource_code = base.resource_code
  AND limit_row.max_value = base.previous_value;

ALTER TABLE companies ALTER COLUMN plan_type SET DEFAULT 'VRETE_EMPRESARIAL';
ALTER TABLE company_payments ALTER COLUMN plan_type SET DEFAULT 'VRETE_EMPRESARIAL';

UPDATE companies
SET plan_type = 'VRETE_EMPRESARIAL',
    updated_at = NOW()
WHERE plan_type IN ('BASIC', 'PREMIUM', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');

UPDATE company_payments
SET plan_type = 'VRETE_EMPRESARIAL',
    updated_at = NOW()
WHERE plan_type IN ('BASIC', 'PREMIUM', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');

DELETE FROM saas_plans
WHERE code IN ('BASIC', 'PREMIUM', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');

DROP TYPE IF EXISTS "enum_companies_plan_type";
DROP TYPE IF EXISTS "enum_company_payments_plan_type";

-- Paid activations store the USD amount plus the boliviano equivalent and the rate used.
ALTER TABLE company_payments ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(14, 6) NULL;
ALTER TABLE company_payments ADD COLUMN IF NOT EXISTS amount_bob DECIMAL(12, 2) NULL;

-- Limits locked when a subscription starts. Later catalog edits do not rewrite these rows.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_users INTEGER NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_animals INTEGER NULL;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_activity_records INTEGER NULL;

ALTER TABLE company_payments ADD COLUMN IF NOT EXISTS max_users INTEGER NULL;
ALTER TABLE company_payments ADD COLUMN IF NOT EXISTS max_animals INTEGER NULL;
ALTER TABLE company_payments ADD COLUMN IF NOT EXISTS max_activity_records INTEGER NULL;

-- Freeze companies that already have a subscription at the catalog limits of this moment.
-- Rows that already have a snapshot are left unchanged.
UPDATE companies AS company
SET
    max_users = users.max_value,
    max_animals = animals.max_value,
    max_activity_records = activities.max_value,
    updated_at = NOW()
FROM saas_plans AS plan
JOIN saas_plan_limits AS users
    ON users.uuid_plan = plan.uuid_plan AND users.resource_code = 'USERS'
JOIN saas_plan_limits AS animals
    ON animals.uuid_plan = plan.uuid_plan AND animals.resource_code = 'ANIMALS'
JOIN saas_plan_limits AS activities
    ON activities.uuid_plan = plan.uuid_plan AND activities.resource_code = 'ACTIVITY_RECORDS'
WHERE company.plan_type = plan.code
  AND company.membership_status IN ('ACTIVE', 'TRIAL')
  AND company.max_users IS NULL
  AND company.max_animals IS NULL
  AND company.max_activity_records IS NULL;

UPDATE company_payments AS payment
SET
    max_users = limits.users,
    max_animals = limits.animals,
    max_activity_records = limits.activities,
    updated_at = NOW()
FROM (
    SELECT DISTINCT ON (cp.uuid_company)
        cp.uuid_company_payment,
        users.max_value AS users,
        animals.max_value AS animals,
        activities.max_value AS activities
    FROM company_payments cp
    JOIN companies c ON c.uuid_company = cp.uuid_company
    JOIN saas_plans sp ON sp.code = cp.plan_type
    JOIN saas_plan_limits users
        ON users.uuid_plan = sp.uuid_plan AND users.resource_code = 'USERS'
    JOIN saas_plan_limits animals
        ON animals.uuid_plan = sp.uuid_plan AND animals.resource_code = 'ANIMALS'
    JOIN saas_plan_limits activities
        ON activities.uuid_plan = sp.uuid_plan AND activities.resource_code = 'ACTIVITY_RECORDS'
    WHERE cp.is_active = TRUE
      AND cp.status = 'POSTED'
      AND c.membership_status IN ('ACTIVE', 'TRIAL')
    ORDER BY cp.uuid_company, cp.period_end DESC NULLS LAST, cp.created_at DESC
) AS limits
WHERE payment.uuid_company_payment = limits.uuid_company_payment
  AND payment.max_users IS NULL
  AND payment.max_animals IS NULL
  AND payment.max_activity_records IS NULL;
