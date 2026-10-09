"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const tenant_request_context_1 = require("../database/tenant/tenant-request-context");
class AnimalAttendanceRepository {
    async findActiveRanch(ranchUuid) {
        const { RanchModel } = (0, tenant_request_context_1.requireTenantModels)();
        const ranch = await RanchModel.findOne({
            where: { uuid_ranch: ranchUuid, is_active: true },
        });
        return ranch ? ranch.get({ plain: true }) : null;
    }
    async findActivePaddock(paddockUuid) {
        const rows = await this.query(`
            SELECT paddock_uuid, ranch_uuid, name, is_active
            FROM paddocks
            WHERE paddock_uuid = :paddockUuid
              AND is_active = true
            LIMIT 1
            `, { paddockUuid });
        return rows[0] ?? null;
    }
    async findAnimalInRanch(animalUuid, ranchUuid) {
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const animal = await AnimalModel.findOne({
            where: { animal_uuid: animalUuid, ranch_uuid: ranchUuid },
            attributes: ['animal_uuid'],
        });
        return animal ? { animal_uuid: animalUuid } : null;
    }
    async summarize(filters) {
        const rows = await this.query(`
            SELECT
                COUNT(*)::int AS expected,
                COUNT(att.animal_uuid)::int AS present
            FROM animals a
            ${this.attendanceJoinSql(filters)}
            WHERE ${this.animalWhereSql(filters, false)}
            `, this.replacements(filters));
        const expected = Number(rows[0]?.expected ?? 0);
        const present = Number(rows[0]?.present ?? 0);
        return {
            expected,
            present,
            absent: Math.max(0, expected - present),
        };
    }
    async countRows(filters) {
        const rows = await this.query(`
            SELECT COUNT(*)::int AS total
            FROM animals a
            ${this.attendanceJoinSql(filters)}
            WHERE ${this.animalWhereSql(filters, true)}
            `, this.replacements(filters));
        return Number(rows[0]?.total ?? 0);
    }
    async findRows(filters) {
        const offset = (filters.page - 1) * filters.size;
        const rows = await this.query(`
            SELECT
                a.animal_uuid,
                a.registration_number,
                a.chip_number,
                a.current_paddock_uuid AS paddock_uuid,
                p.name AS paddock_name,
                att.last_attended_on::text AS last_attended_on
            FROM animals a
            LEFT JOIN paddocks p ON p.paddock_uuid = a.current_paddock_uuid
            ${this.attendanceJoinSql(filters)}
            WHERE ${this.animalWhereSql(filters, true)}
            ORDER BY (att.animal_uuid IS NULL) DESC, a.registration_number ASC
            LIMIT :limit OFFSET :offset
            `, {
            ...this.replacements(filters),
            limit: filters.size,
            offset,
        });
        return rows.map((row) => ({
            animal_uuid: row.animal_uuid,
            registration_number: row.registration_number,
            chip_number: row.chip_number,
            paddock_uuid: row.paddock_uuid,
            paddock_name: row.paddock_name,
            status: row.last_attended_on ? 'PRESENT' : 'ABSENT',
            last_attended_on: row.last_attended_on ? String(row.last_attended_on).slice(0, 10) : null,
        }));
    }
    async findHistory(filters) {
        if (!filters.animalUuid) {
            return [];
        }
        const dateSql = filters.from && filters.to
            ? 'AND s.work_date >= :fromDate AND s.work_date <= :toDate'
            : '';
        const rows = await this.query(`
            SELECT
                uuid_corral_work_session,
                work_date::text AS work_date,
                responsible_person,
                session_status
            FROM (
                SELECT DISTINCT ON (s.uuid_corral_work_session)
                    s.uuid_corral_work_session,
                    s.work_date,
                    s.responsible_person,
                    s.status AS session_status
                FROM corral_activity_records r
                INNER JOIN corral_work_sessions s
                    ON s.uuid_corral_work_session = r.uuid_corral_work_session
                   AND s.is_active = true
                   AND s.ranch_uuid = :ranchUuid
                WHERE r.is_active = true
                  AND r.activity_code = 'ATTENDANCE'
                  AND r.bool_value IS TRUE
                  AND r.animal_uuid = :animalUuid
                  ${dateSql}
                ORDER BY s.uuid_corral_work_session, s.work_date DESC
            ) sessions
            ORDER BY work_date DESC
            `, this.replacements(filters));
        return rows.map((row) => ({
            uuid_corral_work_session: row.uuid_corral_work_session,
            work_date: String(row.work_date).slice(0, 10),
            responsible_person: row.responsible_person,
            session_status: row.session_status,
        }));
    }
    async query(sql, replacements) {
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const sequelize = AnimalModel.sequelize;
        if (!sequelize) {
            return [];
        }
        return sequelize.query(sql, {
            type: sequelize_1.QueryTypes.SELECT,
            replacements,
        });
    }
    attendanceJoinSql(filters) {
        const dateSql = filters.from && filters.to
            ? 'AND s.work_date >= :fromDate AND s.work_date <= :toDate'
            : '';
        return `
            LEFT JOIN (
                SELECT r.animal_uuid, MAX(s.work_date) AS last_attended_on
                FROM corral_activity_records r
                INNER JOIN corral_work_sessions s
                    ON s.uuid_corral_work_session = r.uuid_corral_work_session
                   AND s.is_active = true
                   AND s.ranch_uuid = :ranchUuid
                WHERE r.is_active = true
                  AND r.activity_code = 'ATTENDANCE'
                  AND r.bool_value IS TRUE
                  ${dateSql}
                GROUP BY r.animal_uuid
            ) att ON att.animal_uuid = a.animal_uuid
        `;
    }
    animalWhereSql(filters, applyStatus) {
        const parts = ['a.ranch_uuid = :ranchUuid'];
        if (filters.restrictToActiveInventory) {
            parts.push('a.is_active = true');
            parts.push(`a.current_status = 'ACTIVE'`);
        }
        if (filters.paddockUuid) {
            parts.push('a.current_paddock_uuid = :paddockUuid');
        }
        if (filters.animalUuid) {
            parts.push('a.animal_uuid = :animalUuid');
        }
        if (applyStatus && filters.attendanceStatus === 'PRESENT') {
            parts.push('att.animal_uuid IS NOT NULL');
        }
        if (applyStatus && filters.attendanceStatus === 'ABSENT') {
            parts.push('att.animal_uuid IS NULL');
        }
        return parts.join(' AND ');
    }
    replacements(filters) {
        const replacements = {
            ranchUuid: filters.ranchUuid,
        };
        if (filters.from && filters.to) {
            replacements.fromDate = filters.from;
            replacements.toDate = filters.to;
        }
        if (filters.paddockUuid) {
            replacements.paddockUuid = filters.paddockUuid;
        }
        if (filters.animalUuid) {
            replacements.animalUuid = filters.animalUuid;
        }
        return replacements;
    }
}
exports.default = AnimalAttendanceRepository;
