"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncTenantOperationalSchema = syncTenantOperationalSchema;
const sequelize_1 = require("sequelize");
/**
 * Idempotent DDL patches applied after `sequelize.sync` on each tenant database.
 * `sync({ alter: false })` does not add columns to existing tables; run additive SQL here.
 */
const TENANT_DDL_PATCHES = [
    `ALTER TABLE IF EXISTS animals ADD COLUMN IF NOT EXISTS chip_number VARCHAR(128);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_animals_ranch_chip_number
       ON animals (ranch_uuid, chip_number)
       WHERE chip_number IS NOT NULL AND btrim(chip_number) <> '';`,
    `ALTER TABLE IF EXISTS animal_work_session
       ADD COLUMN IF NOT EXISTS uuid_corral_work_session UUID;`,
    `ALTER TABLE IF EXISTS animal_work_session
       ADD COLUMN IF NOT EXISTS medicine_uuid UUID;`,
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'animal_work_session'
           AND column_name = 'work_session_id'
       ) AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'animal_work_session'
           AND column_name = 'uuid_corral_work_session'
       ) THEN
         UPDATE animal_work_session
         SET uuid_corral_work_session = work_session_id::uuid
         WHERE uuid_corral_work_session IS NULL
           AND work_session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
         ALTER TABLE animal_work_session DROP COLUMN IF EXISTS work_session_id;
       END IF;
     END $$;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_animal_work_session_corral_animal
       ON animal_work_session (uuid_corral_work_session, uuid_animal)
       WHERE is_active = true AND uuid_corral_work_session IS NOT NULL;`,
    `ALTER TABLE IF EXISTS corral_work_sessions
       ADD COLUMN IF NOT EXISTS responsible_person VARCHAR(256);`,
    `ALTER TABLE IF EXISTS corral_work_sessions
       ALTER COLUMN paddock_uuid DROP NOT NULL;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_corral_session_animals_session_animal
       ON corral_session_animals (uuid_corral_work_session, animal_uuid)
       WHERE is_active = true;`,
    `DO $$
     BEGIN
       PERFORM pg_advisory_xact_lock(hashtext('ddl:uq_corral_activity_records_step_animal_activity'));
       DROP INDEX IF EXISTS uq_corral_activity_records_step_animal_activity;
       IF NOT EXISTS (
         SELECT 1 FROM pg_indexes
         WHERE schemaname = 'public'
           AND indexname = 'uq_corral_activity_records_step_animal_activity'
       ) THEN
         CREATE UNIQUE INDEX uq_corral_activity_records_step_animal_activity
           ON corral_activity_records (uuid_corral_session_step, animal_uuid, activity_code)
           WHERE is_active = true
             AND activity_code NOT IN ('VACCINATION', 'DEWORMING');
       END IF;
     END $$;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_corral_step_animals_step_animal
       ON corral_step_animals (uuid_corral_session_step, animal_uuid)
       WHERE is_active = true;`,
    `ALTER TABLE IF EXISTS corral_session_steps
       ADD COLUMN IF NOT EXISTS work_mode VARCHAR(32) NOT NULL DEFAULT 'PRELOADED_SEARCH';`,
    `ALTER TABLE IF EXISTS corral_step_animals
       ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;`,
    `ALTER TABLE IF EXISTS corral_unregistered_step_rows
       ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;`,
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_corral_unregistered_step_rows_step_registration
       ON corral_unregistered_step_rows (uuid_corral_session_step, lower(registration_number))
       WHERE is_active = true;`,
    `ALTER TABLE IF EXISTS animals ALTER COLUMN breed_code DROP NOT NULL;`,
    `ALTER TABLE IF EXISTS animals ALTER COLUMN breed_code DROP DEFAULT;`,
    `ALTER TABLE IF EXISTS animal_movements
       ADD COLUMN IF NOT EXISTS uuid_corral_work_session UUID;`,
    `CREATE TABLE IF NOT EXISTS record_deletion_audits (
        id BIGSERIAL PRIMARY KEY,
        kind CHAR(1) NOT NULL,
        label VARCHAR(160) NOT NULL,
        reasons VARCHAR(96) NOT NULL,
        actor VARCHAR(64) NOT NULL,
        deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_record_deletion_audits_deleted_at
       ON record_deletion_audits (deleted_at DESC);`,
];
async function animalsBirthDateColumnExists(sequelize) {
    const rows = await sequelize.query(`SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'animals'
              AND column_name = 'birth_date'
        ) AS exists`, { type: sequelize_1.QueryTypes.SELECT });
    return Boolean(rows[0]?.exists);
}
async function applyBirthDateNotNullIfNeeded(sequelize) {
    if (!(await animalsBirthDateColumnExists(sequelize))) {
        return;
    }
    await sequelize.query(`
        UPDATE animals
        SET birth_date = DATE '2000-01-01'
        WHERE birth_date IS NULL;
    `);
    await sequelize.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'animals'
                  AND column_name = 'birth_date'
                  AND is_nullable = 'YES'
            ) THEN
                ALTER TABLE animals ALTER COLUMN birth_date SET NOT NULL;
            END IF;
        END $$;
    `);
}
async function applyTenantDdlPatches(sequelize) {
    for (const sql of TENANT_DDL_PATCHES) {
        await sequelize.query(sql);
    }
    await applyBirthDateNotNullIfNeeded(sequelize);
}
/**
 * Applies Sequelize model definitions to the tenant database (creates missing tables).
 * Bump TENANT_SCHEMA_VERSION and add migrations when you need non-additive DDL changes.
 */
async function syncTenantOperationalSchema(sequelize, _models) {
    await sequelize.sync({ alter: false });
    await applyTenantDdlPatches(sequelize);
}
