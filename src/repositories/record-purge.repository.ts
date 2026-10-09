import { QueryTypes, Transaction } from 'sequelize';
import { requireTenantModels, requireTenantSequelize } from '../database/tenant/tenant-request-context';
import {
    AnimalPurgeCandidateRow,
    RecordPurgeAuditWrite,
    RecordDeletionAuditItem,
    WorkSessionPurgeCandidateRow,
} from '../interfaces/record-purge/record-purge.interface';

const ANIMAL_ELIGIBLE_SQL = `
    a.is_active = false
    AND NOT EXISTS (
        SELECT 1
        FROM animals child
        WHERE child.is_active = true
          AND (child.mother_animal_uuid = a.animal_uuid OR child.father_animal_uuid = a.animal_uuid)
    )
    AND NOT EXISTS (
        SELECT 1
        FROM corral_session_animals sa
        INNER JOIN corral_work_sessions s ON s.uuid_corral_work_session = sa.uuid_corral_work_session
        WHERE sa.animal_uuid = a.animal_uuid
          AND sa.is_active = true
          AND s.is_active = true
          AND s.status IN ('DRAFT', 'IN_PROGRESS')
    )
    AND NOT EXISTS (
        SELECT 1
        FROM corral_step_animals sta
        INNER JOIN corral_work_sessions s ON s.uuid_corral_work_session = sta.uuid_corral_work_session
        WHERE sta.animal_uuid = a.animal_uuid
          AND sta.is_active = true
          AND s.is_active = true
          AND s.status IN ('DRAFT', 'IN_PROGRESS')
    )
`;

const SESSION_ELIGIBLE_SQL = `
    (
        s.status = 'CLOSED'
        OR (s.status = 'DRAFT' AND s.started_at IS NULL)
    )
`;

const ANIMAL_DELETE_BY_COLUMN: Array<{ table: string; column: string }> = [
    { table: 'corral_activity_records', column: 'animal_uuid' },
    { table: 'corral_animal_observations', column: 'animal_uuid' },
    { table: 'corral_animal_visual_conditions', column: 'animal_uuid' },
    { table: 'corral_animal_additional_medications', column: 'animal_uuid' },
    { table: 'corral_animal_additional_treatments', column: 'animal_uuid' },
    { table: 'corral_step_animals', column: 'animal_uuid' },
    { table: 'corral_session_animals', column: 'animal_uuid' },
    { table: 'corral_session_sources', column: 'animal_uuid' },
    { table: 'animal_work_session', column: 'uuid_animal' },
    { table: 'work_order_animals', column: 'animal_uuid' },
    { table: 'milk_records', column: 'animal_uuid' },
    { table: 'animal_purchases', column: 'animal_uuid' },
    { table: 'animal_sales', column: 'animal_uuid' },
    { table: 'animal_disposals', column: 'animal_uuid' },
    { table: 'pregnancy_checks', column: 'female_animal_uuid' },
    { table: 'abortions', column: 'female_animal_uuid' },
    { table: 'health_campaign_animals', column: 'animal_uuid' },
    { table: 'inseminations', column: 'female_animal_uuid' },
    { table: 'natural_breeding_bulls', column: 'bull_animal_uuid' },
    { table: 'natural_breeding_females', column: 'female_animal_uuid' },
    { table: 'animal_movements', column: 'animal_uuid' },
    { table: 'animal_owner_transfers', column: 'animal_uuid' },
    { table: 'animal_identifications', column: 'animal_uuid' },
    { table: 'weight_records', column: 'animal_uuid' },
];

export default class RecordPurgeRepository {
    async listAnimalCandidates(params: {
        search?: string;
        limit: number;
        offset: number;
    }): Promise<{ rows: AnimalPurgeCandidateRow[]; count: number }> {
        const sequelize = requireTenantSequelize();
        const searchLike = params.search ? `%${params.search}%` : null;
        const replacements = { searchLike, limit: params.limit, offset: params.offset };
        const whereSearch = `
            (:searchLike IS NULL
                OR a.registration_number ILIKE :searchLike
                OR COALESCE(a.chip_number, '') ILIKE :searchLike
                OR r.name ILIKE :searchLike)
        `;

        const countRows = await sequelize.query<{ count: string }>(
            `SELECT COUNT(*)::int AS count
             FROM animals a
             INNER JOIN ranches r ON r.uuid_ranch = a.ranch_uuid
             WHERE ${ANIMAL_ELIGIBLE_SQL}
               AND ${whereSearch}`,
            { replacements, type: QueryTypes.SELECT }
        );

        const rows = await sequelize.query<AnimalPurgeCandidateRow>(
            `SELECT
                a.animal_uuid,
                a.registration_number,
                a.chip_number,
                a.sex,
                a.current_status,
                r.name AS ranch_name
             FROM animals a
             INNER JOIN ranches r ON r.uuid_ranch = a.ranch_uuid
             WHERE ${ANIMAL_ELIGIBLE_SQL}
               AND ${whereSearch}
             ORDER BY a.updated_at DESC
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT }
        );

        return { rows, count: Number(countRows[0]?.count ?? 0) };
    }

    async listWorkSessionCandidates(params: {
        search?: string;
        limit: number;
        offset: number;
    }): Promise<{ rows: WorkSessionPurgeCandidateRow[]; count: number }> {
        const sequelize = requireTenantSequelize();
        const searchLike = params.search ? `%${params.search}%` : null;
        const replacements = { searchLike, limit: params.limit, offset: params.offset };
        const whereSearch = `
            (:searchLike IS NULL
                OR r.name ILIKE :searchLike
                OR COALESCE(s.responsible_person, '') ILIKE :searchLike
                OR s.work_date::text ILIKE :searchLike
                OR s.status ILIKE :searchLike)
        `;

        const countRows = await sequelize.query<{ count: string }>(
            `SELECT COUNT(*)::int AS count
             FROM corral_work_sessions s
             INNER JOIN ranches r ON r.uuid_ranch = s.ranch_uuid
             WHERE ${SESSION_ELIGIBLE_SQL}
               AND ${whereSearch}`,
            { replacements, type: QueryTypes.SELECT }
        );

        const rows = await sequelize.query<WorkSessionPurgeCandidateRow>(
            `SELECT
                s.uuid_corral_work_session,
                s.work_date::text AS work_date,
                s.status,
                s.responsible_person,
                r.name AS ranch_name,
                COALESCE((
                    SELECT json_agg(code ORDER BY code)
                    FROM (
                        SELECT DISTINCT act.activity_code AS code
                        FROM corral_session_steps st
                        INNER JOIN corral_step_activities act
                            ON act.uuid_corral_session_step = st.uuid_corral_session_step
                           AND act.is_active = true
                        WHERE st.uuid_corral_work_session = s.uuid_corral_work_session
                          AND st.is_active = true
                        UNION
                        SELECT DISTINCT pa.activity_type AS code
                        FROM work_session_planned_activities pa
                        WHERE pa.uuid_corral_work_session = s.uuid_corral_work_session
                          AND pa.is_active = true
                    ) codes
                ), '[]'::json) AS activity_codes,
                (
                    SELECT COUNT(*)::int
                    FROM corral_session_animals sa
                    WHERE sa.uuid_corral_work_session = s.uuid_corral_work_session
                      AND sa.is_active = true
                ) AS animal_count,
                (
                    SELECT COUNT(*)::int
                    FROM corral_session_animals sa
                    INNER JOIN animals an ON an.animal_uuid = sa.animal_uuid AND an.is_active = true
                    WHERE sa.uuid_corral_work_session = s.uuid_corral_work_session
                      AND sa.is_active = true
                ) AS active_animal_count
             FROM corral_work_sessions s
             INNER JOIN ranches r ON r.uuid_ranch = s.ranch_uuid
             WHERE ${SESSION_ELIGIBLE_SQL}
               AND ${whereSearch}
             ORDER BY s.work_date DESC, s.created_at DESC
             LIMIT :limit OFFSET :offset`,
            { replacements, type: QueryTypes.SELECT }
        );

        return { rows, count: Number(countRows[0]?.count ?? 0) };
    }

    async findAnimalCandidate(animalUuid: string): Promise<AnimalPurgeCandidateRow | null> {
        const sequelize = requireTenantSequelize();
        const rows = await sequelize.query<AnimalPurgeCandidateRow>(
            `SELECT
                a.animal_uuid,
                a.registration_number,
                a.chip_number,
                a.sex,
                a.current_status,
                r.name AS ranch_name
             FROM animals a
             INNER JOIN ranches r ON r.uuid_ranch = a.ranch_uuid
             WHERE a.animal_uuid = :animalUuid
               AND ${ANIMAL_ELIGIBLE_SQL}`,
            { replacements: { animalUuid }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }

    async findWorkSessionCandidate(sessionUuid: string): Promise<WorkSessionPurgeCandidateRow | null> {
        const sequelize = requireTenantSequelize();
        const rows = await sequelize.query<WorkSessionPurgeCandidateRow>(
            `SELECT
                s.uuid_corral_work_session,
                s.work_date::text AS work_date,
                s.status,
                s.responsible_person,
                r.name AS ranch_name,
                COALESCE((
                    SELECT json_agg(code ORDER BY code)
                    FROM (
                        SELECT DISTINCT act.activity_code AS code
                        FROM corral_session_steps st
                        INNER JOIN corral_step_activities act
                            ON act.uuid_corral_session_step = st.uuid_corral_session_step
                           AND act.is_active = true
                        WHERE st.uuid_corral_work_session = s.uuid_corral_work_session
                          AND st.is_active = true
                        UNION
                        SELECT DISTINCT pa.activity_type AS code
                        FROM work_session_planned_activities pa
                        WHERE pa.uuid_corral_work_session = s.uuid_corral_work_session
                          AND pa.is_active = true
                    ) codes
                ), '[]'::json) AS activity_codes,
                (
                    SELECT COUNT(*)::int
                    FROM corral_session_animals sa
                    WHERE sa.uuid_corral_work_session = s.uuid_corral_work_session
                      AND sa.is_active = true
                ) AS animal_count,
                (
                    SELECT COUNT(*)::int
                    FROM corral_session_animals sa
                    INNER JOIN animals an ON an.animal_uuid = sa.animal_uuid AND an.is_active = true
                    WHERE sa.uuid_corral_work_session = s.uuid_corral_work_session
                      AND sa.is_active = true
                ) AS active_animal_count
             FROM corral_work_sessions s
             INNER JOIN ranches r ON r.uuid_ranch = s.ranch_uuid
             WHERE s.uuid_corral_work_session = :sessionUuid
               AND ${SESSION_ELIGIBLE_SQL}`,
            { replacements: { sessionUuid }, type: QueryTypes.SELECT }
        );
        return rows[0] ?? null;
    }

    async purgeAnimal(animalUuid: string, audit: RecordPurgeAuditWrite): Promise<boolean> {
        const sequelize = requireTenantSequelize();
        return sequelize.transaction(async (transaction) => {
            const locked = await sequelize.query<{ animal_uuid: string }>(
                `SELECT a.animal_uuid
                 FROM animals a
                 WHERE a.animal_uuid = :animalUuid
                   AND ${ANIMAL_ELIGIBLE_SQL}
                 FOR UPDATE OF a`,
                { replacements: { animalUuid }, type: QueryTypes.SELECT, transaction }
            );
            if (!locked[0]) {
                return false;
            }

            await this.deleteAnimalGraph(animalUuid, transaction);
            await this.insertAudit(audit, transaction);
            return true;
        });
    }

    async purgeWorkSession(sessionUuid: string, audit: RecordPurgeAuditWrite): Promise<boolean> {
        const sequelize = requireTenantSequelize();
        return sequelize.transaction(async (transaction) => {
            const locked = await sequelize.query<{ uuid_corral_work_session: string }>(
                `SELECT s.uuid_corral_work_session
                 FROM corral_work_sessions s
                 WHERE s.uuid_corral_work_session = :sessionUuid
                   AND ${SESSION_ELIGIBLE_SQL}
                 FOR UPDATE OF s`,
                { replacements: { sessionUuid }, type: QueryTypes.SELECT, transaction }
            );
            if (!locked[0]) {
                return false;
            }

            await this.deleteWorkSessionGraph(sessionUuid, transaction);
            await this.insertAudit(audit, transaction);
            return true;
        });
    }

    async listAudits(params: {
        limit: number;
        offset: number;
    }): Promise<{ rows: RecordDeletionAuditItem[]; count: number }> {
        const { RecordDeletionAuditModel } = requireTenantModels();
        const result = await RecordDeletionAuditModel.findAndCountAll({
            order: [['deleted_at', 'DESC']],
            limit: params.limit,
            offset: params.offset,
        });

        const rows: RecordDeletionAuditItem[] = result.rows.map((row) => {
            const plain = row.get({ plain: true }) as {
                id: string | number;
                kind: string;
                label: string;
                reasons: string;
                actor: string;
                deleted_at: Date;
            };
            return {
                id: String(plain.id),
                kind: plain.kind === 'W' ? 'W' : 'A',
                label: plain.label,
                reasons: plain.reasons.split(',').filter(Boolean),
                actor: plain.actor,
                deleted_at: plain.deleted_at instanceof Date
                    ? plain.deleted_at.toISOString()
                    : String(plain.deleted_at),
            };
        });

        return { rows, count: result.count };
    }

    private async deleteAnimalGraph(animalUuid: string, transaction: Transaction): Promise<void> {
        const sequelize = requireTenantSequelize();
        for (const target of ANIMAL_DELETE_BY_COLUMN) {
            await sequelize.query(
                `DELETE FROM ${target.table} WHERE ${target.column} = :animalUuid`,
                { replacements: { animalUuid }, transaction }
            );
        }

        await sequelize.query(
            `DELETE FROM births
             WHERE mother_animal_uuid = :animalUuid
                OR father_animal_uuid = :animalUuid
                OR newborn_animal_uuid = :animalUuid`,
            { replacements: { animalUuid }, transaction }
        );
        await sequelize.query(
            `UPDATE animals SET mother_animal_uuid = NULL WHERE mother_animal_uuid = :animalUuid`,
            { replacements: { animalUuid }, transaction }
        );
        await sequelize.query(
            `UPDATE animals SET father_animal_uuid = NULL WHERE father_animal_uuid = :animalUuid`,
            { replacements: { animalUuid }, transaction }
        );
        await sequelize.query(
            `DELETE FROM animals WHERE animal_uuid = :animalUuid`,
            { replacements: { animalUuid }, transaction }
        );
    }

    private async deleteWorkSessionGraph(sessionUuid: string, transaction: Transaction): Promise<void> {
        const sequelize = requireTenantSequelize();
        const sessionTables = [
            'corral_activity_records',
            'corral_animal_observations',
            'corral_animal_visual_conditions',
            'corral_animal_additional_medications',
            'corral_animal_additional_treatments',
            'corral_step_animals',
            'corral_unregistered_step_rows',
            'corral_session_animals',
            'corral_session_sources',
            'work_session_planned_activities',
            'animal_work_session',
        ];

        for (const table of sessionTables) {
            await sequelize.query(
                `DELETE FROM ${table} WHERE uuid_corral_work_session = :sessionUuid`,
                { replacements: { sessionUuid }, transaction }
            );
        }

        await sequelize.query(
            `DELETE FROM corral_step_activities
             WHERE uuid_corral_session_step IN (
                SELECT uuid_corral_session_step
                FROM corral_session_steps
                WHERE uuid_corral_work_session = :sessionUuid
             )`,
            { replacements: { sessionUuid }, transaction }
        );
        await sequelize.query(
            `DELETE FROM corral_session_steps WHERE uuid_corral_work_session = :sessionUuid`,
            { replacements: { sessionUuid }, transaction }
        );
        await sequelize.query(
            `UPDATE animal_movements
             SET uuid_corral_work_session = NULL
             WHERE uuid_corral_work_session = :sessionUuid`,
            { replacements: { sessionUuid }, transaction }
        );
        await sequelize.query(
            `DELETE FROM corral_work_sessions WHERE uuid_corral_work_session = :sessionUuid`,
            { replacements: { sessionUuid }, transaction }
        );
    }

    private async insertAudit(audit: RecordPurgeAuditWrite, transaction: Transaction): Promise<void> {
        const { RecordDeletionAuditModel } = requireTenantModels();
        await RecordDeletionAuditModel.create(
            {
                kind: audit.kind,
                label: audit.label.slice(0, 160),
                reasons: audit.reasons.slice(0, 96),
                actor: audit.actor.slice(0, 64),
                deleted_at: new Date(),
            },
            { transaction }
        );
    }
}
