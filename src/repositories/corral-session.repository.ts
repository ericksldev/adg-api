import { Op, QueryTypes, Transaction } from 'sequelize';
import type { Model } from 'sequelize';
import { requireTenantModels, requireTenantSequelize } from '../database/tenant/tenant-request-context';
import { buildAnimalIdentifierExactMatchClause } from '../utils/animal-identifier.util';
import {
    CorralWorkSessionAttributes,
    CorralWorkSessionCreationAttributes,
} from '../interfaces/corral-session/corral-session.interface';
import {
    CorralActivityCode,
    CorralSessionSourceType,
    CorralStepWorkMode,
    CorralWorkSessionStatus,
} from '../constants/corral-work.constants';
import type {
    CorralActivityRecordAttributes,
    CorralSessionAnimalAttributes,
    CorralSessionSourceAttributes,
    CorralSessionStepAttributes,
    CorralStepActivityAttributes,
    CorralUnregisteredStepRowAttributes,
    AnimalWorkHistorySource,
    PendingAnimalRegistrationDto,
    PendingAnimalRegistrationSessionDto,
} from '../interfaces/corral-session/corral-session.interface';

export interface CorralWorkSessionListParams {
    page: number;
    size: number;
    sortBy: string;
    order: 'ASC' | 'DESC';
    ranch_uuid?: string;
    status?: string;
    work_date?: string;
    activity_code?: CorralActivityCode;
}

class CorralSessionRepository {
    async findAllSessions(
        params: CorralWorkSessionListParams
    ): Promise<{ rows: Model<CorralWorkSessionAttributes>[]; count: number }> {
        const { CorralWorkSessionModel } = requireTenantModels();
        const { page, size, order } = params;
        const where: Record<string, unknown> = { is_active: true };
        if (params.ranch_uuid) where.ranch_uuid = params.ranch_uuid;
        if (params.status) where.status = params.status;
        if (params.work_date) where.work_date = params.work_date;

        if (params.activity_code) {
            const sessionUuids = await this.findSessionUuidsByActivity(params.activity_code);
            if (sessionUuids.length === 0) {
                return { rows: [], count: 0 };
            }
            where.uuid_corral_work_session = { [Op.in]: sessionUuids };
        }

        const sortColumn = params.sortBy === 'work_date' ? 'work_date' : 'created_at';
        return CorralWorkSessionModel.findAndCountAll({
            where,
            offset: (page - 1) * size,
            limit: size,
            order: [[sortColumn, order]],
        });
    }

    private async findSessionUuidsByActivity(activityCode: CorralActivityCode): Promise<string[]> {
        const { CorralSessionStepModel, CorralStepActivityModel } = requireTenantModels();
        const activityRows = await CorralStepActivityModel.findAll({
            where: { activity_code: activityCode, is_active: true },
            attributes: ['uuid_corral_session_step'],
        });
        const stepUuids = [
            ...new Set(activityRows.map((row) => row.get('uuid_corral_session_step') as string)),
        ];
        if (stepUuids.length === 0) {
            return [];
        }

        const stepRows = await CorralSessionStepModel.findAll({
            where: { uuid_corral_session_step: { [Op.in]: stepUuids }, is_active: true },
            attributes: ['uuid_corral_work_session'],
        });
        return [...new Set(stepRows.map((row) => row.get('uuid_corral_work_session') as string))];
    }

    async findSessionById(uuid: string): Promise<Model<CorralWorkSessionAttributes> | null> {
        const { CorralWorkSessionModel } = requireTenantModels();
        return CorralWorkSessionModel.findOne({ where: { uuid_corral_work_session: uuid, is_active: true } });
    }

    async createSession(data: CorralWorkSessionCreationAttributes): Promise<Model<CorralWorkSessionAttributes>> {
        const { CorralWorkSessionModel } = requireTenantModels();
        return CorralWorkSessionModel.create(data);
    }

    async updateSession(
        uuid: string,
        data: Partial<CorralWorkSessionCreationAttributes>
    ): Promise<Model<CorralWorkSessionAttributes> | null> {
        const { CorralWorkSessionModel } = requireTenantModels();
        const [count, rows] = await CorralWorkSessionModel.update(data, {
            where: { uuid_corral_work_session: uuid, is_active: true },
            returning: true,
        });
        return count > 0 ? rows[0] : null;
    }

    async findStepsWithActivities(sessionUuid: string): Promise<Array<{
        step: CorralSessionStepAttributes;
        activities: CorralActivityCode[];
    }>> {
        const { CorralSessionStepModel, CorralStepActivityModel } = requireTenantModels();
        const steps = await CorralSessionStepModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            order: [['step_order', 'ASC']],
        });
        const result: Array<{ step: CorralSessionStepAttributes; activities: CorralActivityCode[] }> = [];
        for (const row of steps) {
            const step = row.get({ plain: true }) as CorralSessionStepAttributes;
            const activityRows = await CorralStepActivityModel.findAll({
                where: { uuid_corral_session_step: step.uuid_corral_session_step, is_active: true },
            });
            result.push({
                step,
                activities: activityRows.map((a) => a.get('activity_code') as CorralActivityCode),
            });
        }
        return result;
    }

    async createStep(
        sessionUuid: string,
        stepOrder: number,
        label?: string | null,
        workMode: CorralStepWorkMode = CorralStepWorkMode.PRELOADED_SEARCH
    ): Promise<Model<CorralSessionStepAttributes>> {
        const { CorralSessionStepModel } = requireTenantModels();
        return CorralSessionStepModel.create({
            uuid_corral_work_session: sessionUuid,
            step_order: stepOrder,
            label: label ?? `Step ${stepOrder}`,
            work_mode: workMode,
        });
    }

    async deactivateStepsAndActivities(sessionUuid: string): Promise<void> {
        const { CorralSessionStepModel, CorralStepActivityModel } = requireTenantModels();
        const steps = await CorralSessionStepModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            attributes: ['uuid_corral_session_step'],
        });
        const stepUuids = steps.map((row) => row.get('uuid_corral_session_step') as string);
        if (stepUuids.length > 0) {
            await CorralStepActivityModel.update(
                { is_active: false },
                { where: { uuid_corral_session_step: { [Op.in]: stepUuids }, is_active: true } }
            );
        }
        await CorralSessionStepModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, is_active: true } }
        );
    }

    async ensureSessionAnimal(
        sessionUuid: string,
        animal: { animal_uuid: string; registration_number: string; chip_number?: string | null },
        isExpected = false
    ): Promise<void> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        const existing = await CorralSessionAnimalModel.findOne({
            where: { uuid_corral_work_session: sessionUuid, animal_uuid: animal.animal_uuid, is_active: true },
        });
        if (existing) return;
        await CorralSessionAnimalModel.create({
            uuid_corral_work_session: sessionUuid,
            animal_uuid: animal.animal_uuid,
            registration_number: animal.registration_number,
            chip_number: animal.chip_number ?? null,
            attended: false,
            is_expected: isExpected,
            is_active: true,
        });
    }

    async ensureStepAnimal(
        sessionUuid: string,
        stepUuid: string,
        animalUuid: string
    ): Promise<void> {
        const { CorralStepAnimalModel } = requireTenantModels();
        const existing = await CorralStepAnimalModel.findOne({
            where: {
                uuid_corral_session_step: stepUuid,
                animal_uuid: animalUuid,
                is_active: true,
            },
        });
        if (existing) return;
        await CorralStepAnimalModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid,
            animal_uuid: animalUuid,
            is_active: true,
        });
    }

    async findSessionAnimal(
        sessionUuid: string,
        animalUuid: string
    ): Promise<CorralSessionAnimalAttributes | null> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        const row = await CorralSessionAnimalModel.findOne({
            where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true },
        });
        return row ? (row.get({ plain: true }) as CorralSessionAnimalAttributes) : null;
    }

    async updateStepWorkMode(
        stepUuid: string,
        workMode: CorralStepWorkMode
    ): Promise<void> {
        const { CorralSessionStepModel } = requireTenantModels();
        await CorralSessionStepModel.update(
            { work_mode: workMode },
            { where: { uuid_corral_session_step: stepUuid, is_active: true } }
        );
    }

    async createStepActivity(stepUuid: string, activityCode: CorralActivityCode): Promise<void> {
        const { CorralStepActivityModel } = requireTenantModels();
        await CorralStepActivityModel.create({
            uuid_corral_session_step: stepUuid,
            activity_code: activityCode,
        });
    }

    async createSource(data: Omit<CorralSessionSourceAttributes, 'uuid_corral_session_source' | 'is_active'>): Promise<void> {
        const { CorralSessionSourceModel } = requireTenantModels();
        await CorralSessionSourceModel.create({ ...data, is_active: true });
    }

    async findSources(sessionUuid: string): Promise<CorralSessionSourceAttributes[]> {
        const { CorralSessionSourceModel } = requireTenantModels();
        const rows = await CorralSessionSourceModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
        return rows.map((r) => r.get({ plain: true }) as CorralSessionSourceAttributes);
    }

    async bulkCreateSessionAnimals(
        animals: Array<Omit<CorralSessionAnimalAttributes, 'uuid_corral_session_animal' | 'is_active' | 'attended'>>
    ): Promise<void> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        if (animals.length === 0) return;
        await CorralSessionAnimalModel.bulkCreate(
            animals.map((a) => ({ ...a, attended: false, is_active: true }))
        );
    }

    async findSessionAnimals(sessionUuid: string): Promise<CorralSessionAnimalAttributes[]> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        const rows = await CorralSessionAnimalModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            order: [['registration_number', 'ASC']],
        });
        return rows.map((r) => r.get({ plain: true }) as CorralSessionAnimalAttributes);
    }

    async findActivityRecordsForStep(
        sessionUuid: string,
        stepUuid: string
    ): Promise<CorralActivityRecordAttributes[]> {
        const { CorralActivityRecordModel } = requireTenantModels();
        const rows = await CorralActivityRecordModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
        });
        return rows.map((r) => r.get({ plain: true }) as CorralActivityRecordAttributes);
    }

    async upsertActivityRecord(
        payload: Omit<CorralActivityRecordAttributes, 'uuid_corral_activity_record' | 'is_active' | 'created_at' | 'updated_at'>,
        transaction?: Transaction
    ): Promise<CorralActivityRecordAttributes> {
        const { CorralActivityRecordModel } = requireTenantModels();
        const existing = await CorralActivityRecordModel.findOne({
            where: {
                uuid_corral_work_session: payload.uuid_corral_work_session,
                uuid_corral_session_step: payload.uuid_corral_session_step,
                animal_uuid: payload.animal_uuid,
                activity_code: payload.activity_code,
                is_active: true,
            },
            transaction,
        });
        if (existing) {
            await existing.update(
                {
                    bool_value: payload.bool_value,
                    numeric_value: payload.numeric_value,
                    text_value: payload.text_value,
                    medicine_uuid: payload.medicine_uuid,
                    dose: payload.dose,
                    unit: payload.unit,
                    identification_type: payload.identification_type,
                    weight_record_uuid: payload.weight_record_uuid,
                },
                { transaction }
            );
            return existing.get({ plain: true }) as CorralActivityRecordAttributes;
        }
        const created = await CorralActivityRecordModel.create(
            { ...payload, is_active: true },
            { transaction }
        );
        return created.get({ plain: true }) as CorralActivityRecordAttributes;
    }

    /**
     * Commercial activity unit for the current calendar year: one animal processed in one activity inside one step.
     * Multiple medicine rows of the same multi-record activity count once.
     * Inactive rows are excluded so a replace (deactivate + create) does not double-count.
     * Derived tables (weight_records, animal_movements, and similar) are not included.
     */
    async countActiveActivityParticipations(): Promise<number> {
        const sequelize = requireTenantSequelize();
        const rows = await sequelize.query<{ total: number }>(
            `
            SELECT COUNT(*)::int AS total
            FROM (
                SELECT 1
                FROM corral_activity_records AS record
                JOIN corral_work_sessions AS session
                    ON session.uuid_corral_work_session = record.uuid_corral_work_session
                WHERE record.is_active = true
                  AND session.work_date >= date_trunc('year', CURRENT_DATE)
                  AND session.work_date < date_trunc('year', CURRENT_DATE) + interval '1 year'
                GROUP BY record.uuid_corral_work_session, record.uuid_corral_session_step, record.animal_uuid, record.activity_code
            ) AS participations
            `,
            { type: QueryTypes.SELECT }
        );
        return Number(rows[0]?.total ?? 0);
    }

    async findActiveParticipationKeys(sessionUuid: string, stepUuid: string): Promise<Set<string>> {
        const { CorralActivityRecordModel } = requireTenantModels();
        const rows = await CorralActivityRecordModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
            attributes: ['animal_uuid', 'activity_code'],
        });
        const keys = new Set<string>();
        for (const row of rows) {
            keys.add(`${row.get('animal_uuid')}:${row.get('activity_code')}`);
        }
        return keys;
    }

    async replaceMultiActivityRecords(
        sessionUuid: string,
        stepUuid: string,
        animalUuid: string,
        activityCode: string,
        items: Array<{
            text_value: string;
            medicine_uuid?: string | null;
            dose?: string | null;
            unit?: string | null;
        }>
    ): Promise<void> {
        const { CorralActivityRecordModel } = requireTenantModels();
        await CorralActivityRecordModel.update(
            { is_active: false },
            {
                where: {
                    uuid_corral_work_session: sessionUuid,
                    uuid_corral_session_step: stepUuid,
                    animal_uuid: animalUuid,
                    activity_code: activityCode,
                    is_active: true,
                },
            }
        );

        for (const item of items) {
            await CorralActivityRecordModel.create({
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                animal_uuid: animalUuid,
                activity_code: activityCode,
                bool_value: null,
                numeric_value: null,
                text_value: item.text_value,
                medicine_uuid: item.medicine_uuid ?? null,
                dose: item.dose ?? null,
                unit: item.unit ?? null,
                identification_type: null,
                weight_record_uuid: null,
                is_active: true,
            });
        }
    }

    async updateSessionAnimalAttendance(sessionUuid: string, animalUuid: string, attended: boolean): Promise<void> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        await CorralSessionAnimalModel.update(
            { attended },
            { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } }
        );
    }

    async countSessionAnimals(sessionUuid: string): Promise<number> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        return CorralSessionAnimalModel.count({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
    }

    async deactivateSessionAnimals(sessionUuid: string): Promise<void> {
        const { CorralSessionAnimalModel } = requireTenantModels();
        await CorralSessionAnimalModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, is_active: true } }
        );
    }

    async deactivateSessionSources(sessionUuid: string): Promise<void> {
        const { CorralSessionSourceModel } = requireTenantModels();
        await CorralSessionSourceModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, is_active: true } }
        );
    }

    async deactivateStepAnimals(sessionUuid: string): Promise<void> {
        const { CorralStepAnimalModel } = requireTenantModels();
        await CorralStepAnimalModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, is_active: true } }
        );
    }

    async bulkCreateStepAnimals(
        rows: Array<{
            uuid_corral_work_session: string;
            uuid_corral_session_step: string;
            animal_uuid: string;
        }>
    ): Promise<void> {
        const { CorralStepAnimalModel } = requireTenantModels();
        if (rows.length === 0) return;
        await CorralStepAnimalModel.bulkCreate(rows.map((row) => ({ ...row, is_active: true })));
    }

    async findStepAnimalUuids(stepUuid: string): Promise<Set<string>> {
        const { CorralStepAnimalModel } = requireTenantModels();
        const rows = await CorralStepAnimalModel.findAll({
            where: { uuid_corral_session_step: stepUuid, is_active: true },
            attributes: ['animal_uuid'],
        });
        return new Set(rows.map((row) => row.get('animal_uuid') as string));
    }

    async findStepQueueScans(sessionUuid: string, stepUuid: string): Promise<string[]> {
        const { CorralStepAnimalModel, CorralUnregisteredStepRowModel } = requireTenantModels();
        const [stepAnimals, unregisteredRows] = await Promise.all([
            CorralStepAnimalModel.findAll({
                where: { uuid_corral_session_step: stepUuid, is_active: true },
                attributes: ['animal_uuid', 'scanned_at'],
            }),
            CorralUnregisteredStepRowModel.findAll({
                where: {
                    uuid_corral_work_session: sessionUuid,
                    uuid_corral_session_step: stepUuid,
                    is_active: true,
                },
                attributes: ['uuid_corral_unregistered_step_row', 'scanned_at'],
            }),
        ]);

        const scanned: Array<{ uuid: string; scannedAt: number }> = [];
        for (const row of stepAnimals) {
            const scannedAt = row.get('scanned_at') as Date | null;
            if (!scannedAt) continue;
            scanned.push({
                uuid: row.get('animal_uuid') as string,
                scannedAt: new Date(scannedAt).getTime(),
            });
        }
        for (const row of unregisteredRows) {
            const scannedAt = row.get('scanned_at') as Date | null;
            if (!scannedAt) continue;
            scanned.push({
                uuid: row.get('uuid_corral_unregistered_step_row') as string,
                scannedAt: new Date(scannedAt).getTime(),
            });
        }

        scanned.sort((left, right) => right.scannedAt - left.scannedAt);
        return scanned.map((item) => item.uuid);
    }

    async replaceStepQueueScans(
        sessionUuid: string,
        stepUuid: string,
        scannedUuids: string[]
    ): Promise<void> {
        const { CorralStepAnimalModel, CorralUnregisteredStepRowModel } = requireTenantModels();
        await CorralStepAnimalModel.update(
            { scanned_at: null },
            { where: { uuid_corral_session_step: stepUuid, is_active: true } }
        );
        await CorralUnregisteredStepRowModel.update(
            { scanned_at: null },
            {
                where: {
                    uuid_corral_work_session: sessionUuid,
                    uuid_corral_session_step: stepUuid,
                    is_active: true,
                },
            }
        );

        const now = Date.now();
        for (let index = 0; index < scannedUuids.length; index += 1) {
            const uuid = scannedUuids[index];
            const scannedAt = new Date(now - index);
            const [updatedStepAnimals] = await CorralStepAnimalModel.update(
                { scanned_at: scannedAt },
                {
                    where: {
                        uuid_corral_session_step: stepUuid,
                        animal_uuid: uuid,
                        is_active: true,
                    },
                }
            );
            if (updatedStepAnimals > 0) continue;
            await CorralUnregisteredStepRowModel.update(
                { scanned_at: scannedAt },
                {
                    where: {
                        uuid_corral_unregistered_step_row: uuid,
                        uuid_corral_session_step: stepUuid,
                        is_active: true,
                    },
                }
            );
        }
    }

    async hasStepAnimalAssignments(sessionUuid: string): Promise<boolean> {
        const { CorralStepAnimalModel } = requireTenantModels();
        const count = await CorralStepAnimalModel.count({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
        return count > 0;
    }

    async resolveAnimalsBySourceBreakdown(
        ranchUuid: string,
        paddockUuids: string[],
        filters: Array<{ filter_key: string; filter_value: string }>,
        manualUuids: string[]
    ): Promise<{
        merged: Array<{ animal_uuid: string; registration_number: string; chip_number?: string | null; sex?: string; breed_code?: string; current_paddock_uuid?: string | null }>;
        fromPaddocks: Set<string>;
        fromFilters: Set<string>;
        fromManual: Set<string>;
    }> {
        const { AnimalModel } = requireTenantModels();
        const baseWhere = {
            ranch_uuid: ranchUuid,
            is_active: true,
            current_status: 'ACTIVE' as const,
        };

        const fromPaddocks = new Set<string>();
        const fromFilters = new Set<string>();
        const fromManual = new Set<string>();
        const merged = new Map<string, { animal_uuid: string; registration_number: string; chip_number?: string | null; sex?: string; breed_code?: string; current_paddock_uuid?: string | null }>();

        const addRows = (
            rows: Array<{ animal_uuid: string; registration_number: string; chip_number?: string | null; sex?: string; breed_code?: string; current_paddock_uuid?: string | null }>,
            bucket: Set<string>
        ) => {
            for (const row of rows) {
                bucket.add(row.animal_uuid);
                merged.set(row.animal_uuid, row);
            }
        };

        if (paddockUuids.length > 0) {
            const rows = await AnimalModel.findAll({
                where: { ...baseWhere, current_paddock_uuid: { [Op.in]: paddockUuids } },
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true }) as typeof merged extends Map<string, infer V> ? V : never), fromPaddocks);
        }

        for (const filter of filters) {
            const key = filter.filter_key.trim().toLowerCase();
            const value = filter.filter_value.trim();
            const filterWhere: Record<string, unknown> = { ...baseWhere };
            if (key === 'sex' && (value === 'MALE' || value === 'FEMALE')) {
                filterWhere.sex = value;
            } else if (key === 'breed_code') {
                filterWhere.breed_code = value;
            } else if (key === 'origin_type') {
                filterWhere.origin_type = value;
            } else {
                continue;
            }
            const rows = await AnimalModel.findAll({
                where: filterWhere,
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true }) as typeof merged extends Map<string, infer V> ? V : never), fromFilters);
        }

        if (manualUuids.length > 0) {
            const rows = await AnimalModel.findAll({
                where: { ...baseWhere, animal_uuid: { [Op.in]: manualUuids } },
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true }) as typeof merged extends Map<string, infer V> ? V : never), fromManual);
        }

        const sorted = [...merged.values()].sort((a, b) => a.registration_number.localeCompare(b.registration_number));
        return { merged: sorted, fromPaddocks, fromFilters, fromManual };
    }

    async resolveAnimalsForSources(
        ranchUuid: string,
        paddockUuids: string[],
        filters: Array<{ filter_key: string; filter_value: string }>,
        manualUuids: string[]
    ): Promise<Array<{ animal_uuid: string; registration_number: string; chip_number?: string | null }>> {
        const { merged } = await this.resolveAnimalsBySourceBreakdown(ranchUuid, paddockUuids, filters, manualUuids);
        return merged;
    }

    async findAnimalInRanchByIdentifier(
        ranchUuid: string,
        identifier: string
    ): Promise<{ animal_uuid: string; registration_number: string; chip_number?: string | null } | null> {
        const identifierClause = buildAnimalIdentifierExactMatchClause(identifier);
        if (!identifierClause) {
            return null;
        }

        const { AnimalModel } = requireTenantModels();
        const row = await AnimalModel.findOne({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                ...identifierClause,
            },
            attributes: ['animal_uuid', 'registration_number', 'chip_number'],
        });
        return row
            ? (row.get({ plain: true }) as {
                  animal_uuid: string;
                  registration_number: string;
                  chip_number?: string | null;
              })
            : null;
    }

    async findAnimalInRanchByUuid(
        ranchUuid: string,
        animalUuid: string
    ): Promise<{
        animal_uuid: string;
        registration_number: string;
        chip_number?: string | null;
        sex: string;
        breed_code?: string | null;
        color?: string | null;
        birth_date: Date | string;
        origin_type: string;
        paddock_name?: string | null;
    } | null> {
        const { AnimalModel, PaddockModel } = requireTenantModels();
        const row = await AnimalModel.findOne({
            where: {
                ranch_uuid: ranchUuid,
                animal_uuid: animalUuid,
                is_active: true,
            },
            attributes: [
                'animal_uuid',
                'registration_number',
                'chip_number',
                'sex',
                'breed_code',
                'color',
                'birth_date',
                'origin_type',
            ],
            include: [
                {
                    model: PaddockModel,
                    as: 'current_paddock',
                    attributes: ['name'],
                    required: false,
                },
            ],
        });
        if (!row) return null;
        const plain = row.get({ plain: true }) as {
            animal_uuid: string;
            registration_number: string;
            chip_number?: string | null;
            sex: string;
            breed_code?: string | null;
            color?: string | null;
            birth_date: Date | string;
            origin_type: string;
            current_paddock?: { name?: string | null } | null;
        };
        return {
            animal_uuid: plain.animal_uuid,
            registration_number: plain.registration_number,
            chip_number: plain.chip_number ?? null,
            sex: plain.sex,
            breed_code: plain.breed_code ?? null,
            color: plain.color ?? null,
            birth_date: plain.birth_date,
            origin_type: plain.origin_type,
            paddock_name: plain.current_paddock?.name ?? null,
        };
    }

    async findAnimalWorkHistory(
        ranchUuid: string,
        animalUuid: string,
        excludeSessionUuid: string,
        limit: number
    ): Promise<AnimalWorkHistorySource> {
        const empty: AnimalWorkHistorySource = {
            sessions: [],
            records: [],
            observations: [],
            conditions: [],
            medications: [],
            treatments: [],
        };
        const {
            CorralWorkSessionModel,
            CorralActivityRecordModel,
            CorralAnimalObservationModel,
            CorralAnimalVisualConditionModel,
            CorralAnimalAdditionalMedicationModel,
            CorralAnimalAdditionalTreatmentModel,
        } = requireTenantModels();

        const animalWhere = {
            animal_uuid: animalUuid,
            is_active: true,
            uuid_corral_work_session: { [Op.ne]: excludeSessionUuid },
        };
        const [recordRefs, observationRefs, conditionRefs, medicationRefs, treatmentRefs] = await Promise.all([
            CorralActivityRecordModel.findAll({ where: animalWhere, attributes: ['uuid_corral_work_session'] }),
            CorralAnimalObservationModel.findAll({ where: animalWhere, attributes: ['uuid_corral_work_session'] }),
            CorralAnimalVisualConditionModel.findAll({ where: animalWhere, attributes: ['uuid_corral_work_session'] }),
            CorralAnimalAdditionalMedicationModel.findAll({ where: animalWhere, attributes: ['uuid_corral_work_session'] }),
            CorralAnimalAdditionalTreatmentModel.findAll({ where: animalWhere, attributes: ['uuid_corral_work_session'] }),
        ]);

        const candidateUuids = [
            ...recordRefs,
            ...observationRefs,
            ...conditionRefs,
            ...medicationRefs,
            ...treatmentRefs,
        ].map((row) => row.get('uuid_corral_work_session') as string);
        const uniqueUuids = [...new Set(candidateUuids)];
        if (uniqueUuids.length === 0) {
            return empty;
        }

        const sessionRows = await CorralWorkSessionModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                uuid_corral_work_session: { [Op.in]: uniqueUuids },
            },
            order: [
                ['work_date', 'DESC'],
                ['created_at', 'DESC'],
            ],
            limit,
        });
        const sessions = sessionRows.map((row) => row.get({ plain: true }) as CorralWorkSessionAttributes);
        const sessionUuids = sessions.map((session) => session.uuid_corral_work_session);
        if (sessionUuids.length === 0) {
            return empty;
        }

        const scopedWhere = {
            animal_uuid: animalUuid,
            is_active: true,
            uuid_corral_work_session: { [Op.in]: sessionUuids },
        };
        const [records, observations, conditions, medications, treatments] = await Promise.all([
            CorralActivityRecordModel.findAll({ where: scopedWhere, order: [['created_at', 'ASC']] }),
            CorralAnimalObservationModel.findAll({ where: scopedWhere, order: [['created_at', 'ASC']] }),
            CorralAnimalVisualConditionModel.findAll({ where: scopedWhere, order: [['created_at', 'ASC']] }),
            CorralAnimalAdditionalMedicationModel.findAll({ where: scopedWhere, order: [['created_at', 'ASC']] }),
            CorralAnimalAdditionalTreatmentModel.findAll({ where: scopedWhere, order: [['created_at', 'ASC']] }),
        ]);

        return {
            sessions,
            records: records.map((row) => row.get({ plain: true }) as CorralActivityRecordAttributes),
            observations: observations.map((row) => row.get({ plain: true }) as AnimalWorkHistorySource['observations'][number]),
            conditions: conditions.map((row) => row.get({ plain: true }) as AnimalWorkHistorySource['conditions'][number]),
            medications: medications.map((row) => row.get({ plain: true }) as AnimalWorkHistorySource['medications'][number]),
            treatments: treatments.map((row) => row.get({ plain: true }) as AnimalWorkHistorySource['treatments'][number]),
        };
    }

    async findActiveAnimalByIdentifier(
        identifier: string
    ): Promise<{
        animal_uuid: string;
        registration_number: string;
        chip_number?: string | null;
        ranch_uuid: string;
    } | null> {
        const identifierClause = buildAnimalIdentifierExactMatchClause(identifier);
        if (!identifierClause) {
            return null;
        }

        const { AnimalModel } = requireTenantModels();
        const row = await AnimalModel.findOne({
            where: {
                is_active: true,
                ...identifierClause,
            },
            attributes: ['animal_uuid', 'registration_number', 'chip_number', 'ranch_uuid'],
        });
        return row
            ? (row.get({ plain: true }) as {
                  animal_uuid: string;
                  registration_number: string;
                  chip_number?: string | null;
                  ranch_uuid: string;
              })
            : null;
    }

    async upsertObservation(
        sessionUuid: string,
        animalUuid: string,
        stepUuid: string | null | undefined,
        text: string
    ): Promise<void> {
        const { CorralAnimalObservationModel } = requireTenantModels();
        await CorralAnimalObservationModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } }
        );
        await CorralAnimalObservationModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid ?? null,
            animal_uuid: animalUuid,
            observation_text: text,
            is_active: true,
        });
    }

    async upsertVisualCondition(
        sessionUuid: string,
        animalUuid: string,
        stepUuid: string | null | undefined,
        conditionCode: string
    ): Promise<void> {
        const { CorralAnimalVisualConditionModel } = requireTenantModels();
        await CorralAnimalVisualConditionModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } }
        );
        await CorralAnimalVisualConditionModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid ?? null,
            animal_uuid: animalUuid,
            condition_code: conditionCode,
            is_active: true,
        });
    }

    async replaceAdditionalMedications(
        sessionUuid: string,
        animalUuid: string,
        stepUuid: string | null | undefined,
        items: Array<{ product_name: string; medicine_uuid?: string | null; dose?: string | null; unit?: string | null }>
    ): Promise<void> {
        const { CorralAnimalAdditionalMedicationModel } = requireTenantModels();
        await CorralAnimalAdditionalMedicationModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } }
        );
        for (const item of items) {
            await CorralAnimalAdditionalMedicationModel.create({
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid ?? null,
                animal_uuid: animalUuid,
                product_name: item.product_name,
                medicine_uuid: item.medicine_uuid ?? null,
                dose: item.dose ?? null,
                unit: item.unit ?? null,
                is_active: true,
            });
        }
    }

    async replaceAdditionalTreatments(
        sessionUuid: string,
        animalUuid: string,
        stepUuid: string | null | undefined,
        items: Array<{ treatment_type: string; description?: string | null }>
    ): Promise<void> {
        const { CorralAnimalAdditionalTreatmentModel } = requireTenantModels();
        await CorralAnimalAdditionalTreatmentModel.update(
            { is_active: false },
            { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } }
        );
        for (const item of items) {
            await CorralAnimalAdditionalTreatmentModel.create({
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid ?? null,
                animal_uuid: animalUuid,
                treatment_type: item.treatment_type,
                description: item.description ?? null,
                is_active: true,
            });
        }
    }

    private normalizeCellValues(
        value: unknown
    ): Record<string, string | number | boolean | string[] | null> {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, string | number | boolean | string[] | null>;
        }
        return {};
    }

    async findUnregisteredStepRows(
        sessionUuid: string,
        stepUuid: string
    ): Promise<CorralUnregisteredStepRowAttributes[]> {
        const { CorralUnregisteredStepRowModel } = requireTenantModels();
        const rows = await CorralUnregisteredStepRowModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
            order: [['created_at', 'ASC']],
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true }) as CorralUnregisteredStepRowAttributes;
            return {
                ...plain,
                cell_values: this.normalizeCellValues(plain.cell_values),
            };
        });
    }

    async upsertUnregisteredStepRow(
        sessionUuid: string,
        stepUuid: string,
        registrationNumber: string,
        cellValues?: Record<string, string | number | boolean | string[] | null>
    ): Promise<CorralUnregisteredStepRowAttributes> {
        const { CorralUnregisteredStepRowModel } = requireTenantModels();
        const existingRows = await this.findUnregisteredStepRows(sessionUuid, stepUuid);
        const key = registrationNumber.toLowerCase();
        const existing = existingRows.find((row) => row.registration_number.toLowerCase() === key);

        if (existing) {
            if (cellValues) {
                await CorralUnregisteredStepRowModel.update(
                    { cell_values: cellValues },
                    { where: { uuid_corral_unregistered_step_row: existing.uuid_corral_unregistered_step_row } }
                );
                return { ...existing, cell_values: cellValues };
            }
            return existing;
        }

        const created = await CorralUnregisteredStepRowModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid,
            registration_number: registrationNumber,
            cell_values: cellValues ?? {},
            is_active: true,
        });
        return created.get({ plain: true }) as CorralUnregisteredStepRowAttributes;
    }

    async listPendingAnimalRegistrations(ranchUuid?: string): Promise<PendingAnimalRegistrationDto[]> {
        const { CorralUnregisteredStepRowModel } = requireTenantModels();
        const sequelize = CorralUnregisteredStepRowModel.sequelize;
        if (!sequelize) {
            return [];
        }

        const ranchClause = ranchUuid ? 'AND s.ranch_uuid = :ranchUuid' : '';
        const rows = await sequelize.query<PendingAnimalRegistrationQueryRow>(
            `
            SELECT
                MIN(btrim(u.registration_number)) AS registration_number,
                s.ranch_uuid,
                MIN(COALESCE(u.scanned_at, u.created_at)) AS first_seen_at,
                MAX(COALESCE(u.scanned_at, u.created_at)) AS last_seen_at,
                json_agg(
                    DISTINCT jsonb_build_object(
                        'uuid_corral_work_session', s.uuid_corral_work_session,
                        'work_date', s.work_date,
                        'responsible_person', s.responsible_person,
                        'status', s.status
                    )
                ) AS sessions
            FROM corral_unregistered_step_rows u
            INNER JOIN corral_work_sessions s
                ON s.uuid_corral_work_session = u.uuid_corral_work_session
               AND s.is_active = true
            WHERE u.is_active = true
              AND btrim(u.registration_number) <> ''
              ${ranchClause}
              AND NOT EXISTS (
                SELECT 1
                FROM animals a
                WHERE a.ranch_uuid = s.ranch_uuid
                  AND a.is_active = true
                  AND (
                    lower(btrim(a.registration_number)) = lower(btrim(u.registration_number))
                    OR (
                      a.chip_number IS NOT NULL
                      AND btrim(a.chip_number) <> ''
                      AND lower(btrim(a.chip_number)) = lower(btrim(u.registration_number))
                    )
                  )
              )
            GROUP BY lower(btrim(u.registration_number)), s.ranch_uuid
            ORDER BY MAX(COALESCE(u.scanned_at, u.created_at)) DESC
            `,
            {
                type: QueryTypes.SELECT,
                replacements: ranchUuid ? { ranchUuid } : {},
            }
        );

        return rows.map((row: PendingAnimalRegistrationQueryRow) => ({
            registration_number: row.registration_number,
            ranch_uuid: row.ranch_uuid,
            first_seen_at: toIsoString(row.first_seen_at),
            last_seen_at: toIsoString(row.last_seen_at),
            sessions: normalizePendingSessions(row.sessions),
        }));
    }

    async countFindings(sessionUuid: string): Promise<number> {
        const {
            CorralAnimalObservationModel,
            CorralAnimalVisualConditionModel,
            CorralAnimalAdditionalMedicationModel,
            CorralAnimalAdditionalTreatmentModel,
        } = requireTenantModels();
        const [o, v, m, t] = await Promise.all([
            CorralAnimalObservationModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalVisualConditionModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalAdditionalMedicationModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalAdditionalTreatmentModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
        ]);
        return o + v + m + t;
    }
}

export default CorralSessionRepository;

interface PendingAnimalRegistrationQueryRow {
    registration_number: string;
    ranch_uuid: string;
    first_seen_at: Date | string;
    last_seen_at: Date | string;
    sessions: PendingAnimalRegistrationSessionDto[] | string | null;
}

function toIsoString(value: Date | string | null): string {
    if (!value) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function normalizePendingSessions(
    value: PendingAnimalRegistrationSessionDto[] | string | null
): PendingAnimalRegistrationSessionDto[] {
    const parsed = typeof value === 'string' ? (JSON.parse(value) as PendingAnimalRegistrationSessionDto[]) : value;
    const sessions = Array.isArray(parsed) ? parsed : [];
    return sessions
        .map((session) => ({
            uuid_corral_work_session: session.uuid_corral_work_session,
            work_date: String(session.work_date).slice(0, 10),
            responsible_person: session.responsible_person ?? null,
            status: session.status,
        }))
        .sort((left, right) => right.work_date.localeCompare(left.work_date));
}
