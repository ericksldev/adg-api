-- Per-step category counters for corral work sessions (tenant DB).
-- New tenants also get the table from sequelize.sync.

CREATE TABLE IF NOT EXISTS corral_step_counters (
    uuid_corral_step_counter UUID PRIMARY KEY,
    uuid_corral_work_session UUID NOT NULL,
    uuid_corral_session_step UUID NOT NULL,
    title VARCHAR(80) NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corral_step_counters_step
    ON corral_step_counters (uuid_corral_session_step)
    WHERE is_active = true;
