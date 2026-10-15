-- Livestock categories (Postgres tenant database).
-- Manual catalog and many-to-many assignment only.

DROP TABLE IF EXISTS livestock_category_rule_conditions;
DROP TABLE IF EXISTS livestock_category_rules;
DROP TABLE IF EXISTS livestock_category_incompatibilities;
DROP TABLE IF EXISTS animal_category_overrides;
DROP TABLE IF EXISTS animal_category_conflicts;

CREATE TABLE IF NOT EXISTS livestock_categories (
    category_uuid UUID PRIMARY KEY,
    uuid_company UUID NULL,
    system_code VARCHAR(64) NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT NULL,
    category_type VARCHAR(32) NOT NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_livestock_categories_system_code
    ON livestock_categories (system_code)
    WHERE is_system = true AND system_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_livestock_categories_company_name
    ON livestock_categories (COALESCE(uuid_company, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

CREATE TABLE IF NOT EXISTS animal_categories (
    animal_category_uuid UUID PRIMARY KEY,
    animal_uuid UUID NOT NULL REFERENCES animals (animal_uuid),
    category_uuid UUID NOT NULL REFERENCES livestock_categories (category_uuid),
    uuid_user UUID NULL,
    assigned_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE animal_categories DROP COLUMN IF EXISTS origin;
ALTER TABLE animal_categories DROP COLUMN IF EXISTS rule_uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_animal_categories_animal_category
    ON animal_categories (animal_uuid, category_uuid);

CREATE TABLE IF NOT EXISTS animal_category_history (
    history_uuid UUID PRIMARY KEY,
    animal_uuid UUID NOT NULL,
    category_uuid UUID NOT NULL,
    action VARCHAR(16) NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    uuid_user UUID NULL,
    reason TEXT NULL
);

ALTER TABLE animal_category_history DROP COLUMN IF EXISTS origin;
ALTER TABLE animal_category_history DROP COLUMN IF EXISTS rule_uuid;

CREATE INDEX IF NOT EXISTS idx_animal_category_history_animal
    ON animal_category_history (animal_uuid, recorded_at DESC);
