-- Terms of service versions and per-user acceptances. Idempotent.
-- The application also creates these tables through Sequelize sync.
-- This script keeps the unique acceptance history index and the foreign keys
-- when the process is applied on a database that already synced the tables.
--
-- Acceptance rows are append-only. Do not update or delete them to "move" a user
-- to a newer version. Publish a new terms_versions row and mark it active instead.
-- At most one row should have is_active = true. The API enforces that on publish.

CREATE TABLE IF NOT EXISTS terms_versions (
    uuid_terms_version UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    requires_acceptance BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS terms_versions_version_uk ON terms_versions (version);
CREATE INDEX IF NOT EXISTS terms_versions_current_idx
    ON terms_versions (is_active, requires_acceptance, effective_at);

CREATE TABLE IF NOT EXISTS terms_acceptances (
    uuid_terms_acceptance UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_user UUID NOT NULL,
    uuid_company UUID NOT NULL,
    uuid_terms_version UUID NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(128) NULL,
    user_agent VARCHAR(512) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS terms_acceptances_user_company_version_uk
    ON terms_acceptances (uuid_user, uuid_company, uuid_terms_version);

CREATE INDEX IF NOT EXISTS terms_acceptances_company_user_idx
    ON terms_acceptances (uuid_company, uuid_user);

DO $$
BEGIN
    ALTER TABLE terms_acceptances
        ADD CONSTRAINT terms_acceptances_user_fk
        FOREIGN KEY (uuid_user) REFERENCES users (uuid_user);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE terms_acceptances
        ADD CONSTRAINT terms_acceptances_company_fk
        FOREIGN KEY (uuid_company) REFERENCES companies (uuid_company);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE terms_acceptances
        ADD CONSTRAINT terms_acceptances_version_fk
        FOREIGN KEY (uuid_terms_version) REFERENCES terms_versions (uuid_terms_version);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
