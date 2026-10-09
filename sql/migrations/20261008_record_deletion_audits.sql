CREATE TABLE IF NOT EXISTS record_deletion_audits (
    id BIGSERIAL PRIMARY KEY,
    kind CHAR(1) NOT NULL,
    label VARCHAR(160) NOT NULL,
    reasons VARCHAR(96) NOT NULL,
    actor VARCHAR(64) NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_record_deletion_audits_deleted_at
    ON record_deletion_audits (deleted_at DESC);
