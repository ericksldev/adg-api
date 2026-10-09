"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const tenant_request_context_1 = require("../database/tenant/tenant-request-context");
const animal_identifier_util_1 = require("../utils/animal-identifier.util");
const corral_work_constants_1 = require("../constants/corral-work.constants");
class CorralSessionRepository {
    async findAllSessions(params) {
        const { CorralWorkSessionModel } = (0, tenant_request_context_1.requireTenantModels)();
        const { page, size, order } = params;
        const where = { is_active: true };
        if (params.ranch_uuid)
            where.ranch_uuid = params.ranch_uuid;
        if (params.status)
            where.status = params.status;
        if (params.work_date)
            where.work_date = params.work_date;
        if (params.activity_code) {
            const sessionUuids = await this.findSessionUuidsByActivity(params.activity_code);
            if (sessionUuids.length === 0) {
                return { rows: [], count: 0 };
            }
            where.uuid_corral_work_session = { [sequelize_1.Op.in]: sessionUuids };
        }
        const sortColumn = params.sortBy === 'work_date' ? 'work_date' : 'created_at';
        return CorralWorkSessionModel.findAndCountAll({
            where,
            offset: (page - 1) * size,
            limit: size,
            order: [[sortColumn, order]],
        });
    }
    async findSessionUuidsByActivity(activityCode) {
        const { CorralSessionStepModel, CorralStepActivityModel } = (0, tenant_request_context_1.requireTenantModels)();
        const activityRows = await CorralStepActivityModel.findAll({
            where: { activity_code: activityCode, is_active: true },
            attributes: ['uuid_corral_session_step'],
        });
        const stepUuids = [
            ...new Set(activityRows.map((row) => row.get('uuid_corral_session_step'))),
        ];
        if (stepUuids.length === 0) {
            return [];
        }
        const stepRows = await CorralSessionStepModel.findAll({
            where: { uuid_corral_session_step: { [sequelize_1.Op.in]: stepUuids }, is_active: true },
            attributes: ['uuid_corral_work_session'],
        });
        return [...new Set(stepRows.map((row) => row.get('uuid_corral_work_session')))];
    }
    async findSessionById(uuid) {
        const { CorralWorkSessionModel } = (0, tenant_request_context_1.requireTenantModels)();
        return CorralWorkSessionModel.findOne({ where: { uuid_corral_work_session: uuid, is_active: true } });
    }
    async createSession(data) {
        const { CorralWorkSessionModel } = (0, tenant_request_context_1.requireTenantModels)();
        return CorralWorkSessionModel.create(data);
    }
    async updateSession(uuid, data) {
        const { CorralWorkSessionModel } = (0, tenant_request_context_1.requireTenantModels)();
        const [count, rows] = await CorralWorkSessionModel.update(data, {
            where: { uuid_corral_work_session: uuid, is_active: true },
            returning: true,
        });
        return count > 0 ? rows[0] : null;
    }
    async findStepsWithActivities(sessionUuid) {
        const { CorralSessionStepModel, CorralStepActivityModel } = (0, tenant_request_context_1.requireTenantModels)();
        const steps = await CorralSessionStepModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            order: [['step_order', 'ASC']],
        });
        const result = [];
        for (const row of steps) {
            const step = row.get({ plain: true });
            const activityRows = await CorralStepActivityModel.findAll({
                where: { uuid_corral_session_step: step.uuid_corral_session_step, is_active: true },
            });
            result.push({
                step,
                activities: activityRows.map((a) => a.get('activity_code')),
            });
        }
        return result;
    }
    async createStep(sessionUuid, stepOrder, label, workMode = corral_work_constants_1.CorralStepWorkMode.PRELOADED_SEARCH) {
        const { CorralSessionStepModel } = (0, tenant_request_context_1.requireTenantModels)();
        return CorralSessionStepModel.create({
            uuid_corral_work_session: sessionUuid,
            step_order: stepOrder,
            label: label ?? `Step ${stepOrder}`,
            work_mode: workMode,
        });
    }
    async deactivateStepsAndActivities(sessionUuid) {
        const { CorralSessionStepModel, CorralStepActivityModel } = (0, tenant_request_context_1.requireTenantModels)();
        const steps = await CorralSessionStepModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            attributes: ['uuid_corral_session_step'],
        });
        const stepUuids = steps.map((row) => row.get('uuid_corral_session_step'));
        if (stepUuids.length > 0) {
            await CorralStepActivityModel.update({ is_active: false }, { where: { uuid_corral_session_step: { [sequelize_1.Op.in]: stepUuids }, is_active: true } });
        }
        await CorralSessionStepModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, is_active: true } });
    }
    async ensureSessionAnimal(sessionUuid, animal, isExpected = false) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const existing = await CorralSessionAnimalModel.findOne({
            where: { uuid_corral_work_session: sessionUuid, animal_uuid: animal.animal_uuid, is_active: true },
        });
        if (existing)
            return;
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
    async ensureStepAnimal(sessionUuid, stepUuid, animalUuid) {
        const { CorralStepAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const existing = await CorralStepAnimalModel.findOne({
            where: {
                uuid_corral_session_step: stepUuid,
                animal_uuid: animalUuid,
                is_active: true,
            },
        });
        if (existing)
            return;
        await CorralStepAnimalModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid,
            animal_uuid: animalUuid,
            is_active: true,
        });
    }
    async findSessionAnimal(sessionUuid, animalUuid) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const row = await CorralSessionAnimalModel.findOne({
            where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true },
        });
        return row ? row.get({ plain: true }) : null;
    }
    async updateStepWorkMode(stepUuid, workMode) {
        const { CorralSessionStepModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralSessionStepModel.update({ work_mode: workMode }, { where: { uuid_corral_session_step: stepUuid, is_active: true } });
    }
    async createStepActivity(stepUuid, activityCode) {
        const { CorralStepActivityModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralStepActivityModel.create({
            uuid_corral_session_step: stepUuid,
            activity_code: activityCode,
        });
    }
    async createSource(data) {
        const { CorralSessionSourceModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralSessionSourceModel.create({ ...data, is_active: true });
    }
    async findSources(sessionUuid) {
        const { CorralSessionSourceModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralSessionSourceModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
        return rows.map((r) => r.get({ plain: true }));
    }
    async bulkCreateSessionAnimals(animals) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        if (animals.length === 0)
            return;
        await CorralSessionAnimalModel.bulkCreate(animals.map((a) => ({ ...a, attended: false, is_active: true })));
    }
    async findSessionAnimals(sessionUuid) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralSessionAnimalModel.findAll({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
            order: [['registration_number', 'ASC']],
        });
        return rows.map((r) => r.get({ plain: true }));
    }
    async findActivityRecordsForStep(sessionUuid, stepUuid) {
        const { CorralActivityRecordModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralActivityRecordModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
        });
        return rows.map((r) => r.get({ plain: true }));
    }
    async upsertActivityRecord(payload, transaction) {
        const { CorralActivityRecordModel } = (0, tenant_request_context_1.requireTenantModels)();
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
            await existing.update({
                bool_value: payload.bool_value,
                numeric_value: payload.numeric_value,
                text_value: payload.text_value,
                medicine_uuid: payload.medicine_uuid,
                dose: payload.dose,
                unit: payload.unit,
                identification_type: payload.identification_type,
                weight_record_uuid: payload.weight_record_uuid,
            }, { transaction });
            return existing.get({ plain: true });
        }
        const created = await CorralActivityRecordModel.create({ ...payload, is_active: true }, { transaction });
        return created.get({ plain: true });
    }
    /**
     * Commercial activity unit for the current calendar year: one animal processed in one activity inside one step.
     * Multiple medicine rows of the same multi-record activity count once.
     * Inactive rows are excluded so a replace (deactivate + create) does not double-count.
     * Derived tables (weight_records, animal_movements, and similar) are not included.
     */
    async countActiveActivityParticipations() {
        const sequelize = (0, tenant_request_context_1.requireTenantSequelize)();
        const rows = await sequelize.query(`
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
            `, { type: sequelize_1.QueryTypes.SELECT });
        return Number(rows[0]?.total ?? 0);
    }
    async findActiveParticipationKeys(sessionUuid, stepUuid) {
        const { CorralActivityRecordModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralActivityRecordModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
            attributes: ['animal_uuid', 'activity_code'],
        });
        const keys = new Set();
        for (const row of rows) {
            keys.add(`${row.get('animal_uuid')}:${row.get('activity_code')}`);
        }
        return keys;
    }
    async replaceMultiActivityRecords(sessionUuid, stepUuid, animalUuid, activityCode, items) {
        const { CorralActivityRecordModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralActivityRecordModel.update({ is_active: false }, {
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                animal_uuid: animalUuid,
                activity_code: activityCode,
                is_active: true,
            },
        });
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
    async updateSessionAnimalAttendance(sessionUuid, animalUuid, attended) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralSessionAnimalModel.update({ attended }, { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } });
    }
    async countSessionAnimals(sessionUuid) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        return CorralSessionAnimalModel.count({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
    }
    async deactivateSessionAnimals(sessionUuid) {
        const { CorralSessionAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralSessionAnimalModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, is_active: true } });
    }
    async deactivateSessionSources(sessionUuid) {
        const { CorralSessionSourceModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralSessionSourceModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, is_active: true } });
    }
    async deactivateStepAnimals(sessionUuid) {
        const { CorralStepAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralStepAnimalModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, is_active: true } });
    }
    async bulkCreateStepAnimals(rows) {
        const { CorralStepAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        if (rows.length === 0)
            return;
        await CorralStepAnimalModel.bulkCreate(rows.map((row) => ({ ...row, is_active: true })));
    }
    async findStepAnimalUuids(stepUuid) {
        const { CorralStepAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralStepAnimalModel.findAll({
            where: { uuid_corral_session_step: stepUuid, is_active: true },
            attributes: ['animal_uuid'],
        });
        return new Set(rows.map((row) => row.get('animal_uuid')));
    }
    async findStepQueueScans(sessionUuid, stepUuid) {
        const { CorralStepAnimalModel, CorralUnregisteredStepRowModel } = (0, tenant_request_context_1.requireTenantModels)();
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
        const scanned = [];
        for (const row of stepAnimals) {
            const scannedAt = row.get('scanned_at');
            if (!scannedAt)
                continue;
            scanned.push({
                uuid: row.get('animal_uuid'),
                scannedAt: new Date(scannedAt).getTime(),
            });
        }
        for (const row of unregisteredRows) {
            const scannedAt = row.get('scanned_at');
            if (!scannedAt)
                continue;
            scanned.push({
                uuid: row.get('uuid_corral_unregistered_step_row'),
                scannedAt: new Date(scannedAt).getTime(),
            });
        }
        scanned.sort((left, right) => right.scannedAt - left.scannedAt);
        return scanned.map((item) => item.uuid);
    }
    async replaceStepQueueScans(sessionUuid, stepUuid, scannedUuids) {
        const { CorralStepAnimalModel, CorralUnregisteredStepRowModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralStepAnimalModel.update({ scanned_at: null }, { where: { uuid_corral_session_step: stepUuid, is_active: true } });
        await CorralUnregisteredStepRowModel.update({ scanned_at: null }, {
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
        });
        const now = Date.now();
        for (let index = 0; index < scannedUuids.length; index += 1) {
            const uuid = scannedUuids[index];
            const scannedAt = new Date(now - index);
            const [updatedStepAnimals] = await CorralStepAnimalModel.update({ scanned_at: scannedAt }, {
                where: {
                    uuid_corral_session_step: stepUuid,
                    animal_uuid: uuid,
                    is_active: true,
                },
            });
            if (updatedStepAnimals > 0)
                continue;
            await CorralUnregisteredStepRowModel.update({ scanned_at: scannedAt }, {
                where: {
                    uuid_corral_unregistered_step_row: uuid,
                    uuid_corral_session_step: stepUuid,
                    is_active: true,
                },
            });
        }
    }
    async hasStepAnimalAssignments(sessionUuid) {
        const { CorralStepAnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const count = await CorralStepAnimalModel.count({
            where: { uuid_corral_work_session: sessionUuid, is_active: true },
        });
        return count > 0;
    }
    async resolveAnimalsBySourceBreakdown(ranchUuid, paddockUuids, filters, manualUuids) {
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const baseWhere = {
            ranch_uuid: ranchUuid,
            is_active: true,
            current_status: 'ACTIVE',
        };
        const fromPaddocks = new Set();
        const fromFilters = new Set();
        const fromManual = new Set();
        const merged = new Map();
        const addRows = (rows, bucket) => {
            for (const row of rows) {
                bucket.add(row.animal_uuid);
                merged.set(row.animal_uuid, row);
            }
        };
        if (paddockUuids.length > 0) {
            const rows = await AnimalModel.findAll({
                where: { ...baseWhere, current_paddock_uuid: { [sequelize_1.Op.in]: paddockUuids } },
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true })), fromPaddocks);
        }
        for (const filter of filters) {
            const key = filter.filter_key.trim().toLowerCase();
            const value = filter.filter_value.trim();
            const filterWhere = { ...baseWhere };
            if (key === 'sex' && (value === 'MALE' || value === 'FEMALE')) {
                filterWhere.sex = value;
            }
            else if (key === 'breed_code') {
                filterWhere.breed_code = value;
            }
            else if (key === 'origin_type') {
                filterWhere.origin_type = value;
            }
            else {
                continue;
            }
            const rows = await AnimalModel.findAll({
                where: filterWhere,
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true })), fromFilters);
        }
        if (manualUuids.length > 0) {
            const rows = await AnimalModel.findAll({
                where: { ...baseWhere, animal_uuid: { [sequelize_1.Op.in]: manualUuids } },
                attributes: ['animal_uuid', 'registration_number', 'chip_number', 'sex', 'breed_code', 'current_paddock_uuid'],
            });
            addRows(rows.map((r) => r.get({ plain: true })), fromManual);
        }
        const sorted = [...merged.values()].sort((a, b) => a.registration_number.localeCompare(b.registration_number));
        return { merged: sorted, fromPaddocks, fromFilters, fromManual };
    }
    async resolveAnimalsForSources(ranchUuid, paddockUuids, filters, manualUuids) {
        const { merged } = await this.resolveAnimalsBySourceBreakdown(ranchUuid, paddockUuids, filters, manualUuids);
        return merged;
    }
    async findAnimalInRanchByIdentifier(ranchUuid, identifier) {
        const identifierClause = (0, animal_identifier_util_1.buildAnimalIdentifierExactMatchClause)(identifier);
        if (!identifierClause) {
            return null;
        }
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const row = await AnimalModel.findOne({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                ...identifierClause,
            },
            attributes: ['animal_uuid', 'registration_number', 'chip_number'],
        });
        return row
            ? row.get({ plain: true })
            : null;
    }
    async findAnimalInRanchByUuid(ranchUuid, animalUuid) {
        const { AnimalModel, PaddockModel } = (0, tenant_request_context_1.requireTenantModels)();
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
        if (!row)
            return null;
        const plain = row.get({ plain: true });
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
    async findAnimalWorkHistory(ranchUuid, animalUuid, excludeSessionUuid, limit) {
        const empty = {
            sessions: [],
            records: [],
            observations: [],
            conditions: [],
            medications: [],
            treatments: [],
        };
        const { CorralWorkSessionModel, CorralActivityRecordModel, CorralAnimalObservationModel, CorralAnimalVisualConditionModel, CorralAnimalAdditionalMedicationModel, CorralAnimalAdditionalTreatmentModel, } = (0, tenant_request_context_1.requireTenantModels)();
        const animalWhere = {
            animal_uuid: animalUuid,
            is_active: true,
            uuid_corral_work_session: { [sequelize_1.Op.ne]: excludeSessionUuid },
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
        ].map((row) => row.get('uuid_corral_work_session'));
        const uniqueUuids = [...new Set(candidateUuids)];
        if (uniqueUuids.length === 0) {
            return empty;
        }
        const sessionRows = await CorralWorkSessionModel.findAll({
            where: {
                ranch_uuid: ranchUuid,
                is_active: true,
                uuid_corral_work_session: { [sequelize_1.Op.in]: uniqueUuids },
            },
            order: [
                ['work_date', 'DESC'],
                ['created_at', 'DESC'],
            ],
            limit,
        });
        const sessions = sessionRows.map((row) => row.get({ plain: true }));
        const sessionUuids = sessions.map((session) => session.uuid_corral_work_session);
        if (sessionUuids.length === 0) {
            return empty;
        }
        const scopedWhere = {
            animal_uuid: animalUuid,
            is_active: true,
            uuid_corral_work_session: { [sequelize_1.Op.in]: sessionUuids },
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
            records: records.map((row) => row.get({ plain: true })),
            observations: observations.map((row) => row.get({ plain: true })),
            conditions: conditions.map((row) => row.get({ plain: true })),
            medications: medications.map((row) => row.get({ plain: true })),
            treatments: treatments.map((row) => row.get({ plain: true })),
        };
    }
    async findActiveAnimalByIdentifier(identifier) {
        const identifierClause = (0, animal_identifier_util_1.buildAnimalIdentifierExactMatchClause)(identifier);
        if (!identifierClause) {
            return null;
        }
        const { AnimalModel } = (0, tenant_request_context_1.requireTenantModels)();
        const row = await AnimalModel.findOne({
            where: {
                is_active: true,
                ...identifierClause,
            },
            attributes: ['animal_uuid', 'registration_number', 'chip_number', 'ranch_uuid'],
        });
        return row
            ? row.get({ plain: true })
            : null;
    }
    async upsertObservation(sessionUuid, animalUuid, stepUuid, text) {
        const { CorralAnimalObservationModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralAnimalObservationModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } });
        await CorralAnimalObservationModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid ?? null,
            animal_uuid: animalUuid,
            observation_text: text,
            is_active: true,
        });
    }
    async upsertVisualCondition(sessionUuid, animalUuid, stepUuid, conditionCode) {
        const { CorralAnimalVisualConditionModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralAnimalVisualConditionModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } });
        await CorralAnimalVisualConditionModel.create({
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid ?? null,
            animal_uuid: animalUuid,
            condition_code: conditionCode,
            is_active: true,
        });
    }
    async replaceAdditionalMedications(sessionUuid, animalUuid, stepUuid, items) {
        const { CorralAnimalAdditionalMedicationModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralAnimalAdditionalMedicationModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } });
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
    async replaceAdditionalTreatments(sessionUuid, animalUuid, stepUuid, items) {
        const { CorralAnimalAdditionalTreatmentModel } = (0, tenant_request_context_1.requireTenantModels)();
        await CorralAnimalAdditionalTreatmentModel.update({ is_active: false }, { where: { uuid_corral_work_session: sessionUuid, animal_uuid: animalUuid, is_active: true } });
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
    normalizeCellValues(value) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            return value;
        }
        return {};
    }
    async findUnregisteredStepRows(sessionUuid, stepUuid) {
        const { CorralUnregisteredStepRowModel } = (0, tenant_request_context_1.requireTenantModels)();
        const rows = await CorralUnregisteredStepRowModel.findAll({
            where: {
                uuid_corral_work_session: sessionUuid,
                uuid_corral_session_step: stepUuid,
                is_active: true,
            },
            order: [['created_at', 'ASC']],
        });
        return rows.map((row) => {
            const plain = row.get({ plain: true });
            return {
                ...plain,
                cell_values: this.normalizeCellValues(plain.cell_values),
            };
        });
    }
    async upsertUnregisteredStepRow(sessionUuid, stepUuid, registrationNumber, cellValues) {
        const { CorralUnregisteredStepRowModel } = (0, tenant_request_context_1.requireTenantModels)();
        const existingRows = await this.findUnregisteredStepRows(sessionUuid, stepUuid);
        const key = registrationNumber.toLowerCase();
        const existing = existingRows.find((row) => row.registration_number.toLowerCase() === key);
        if (existing) {
            if (cellValues) {
                await CorralUnregisteredStepRowModel.update({ cell_values: cellValues }, { where: { uuid_corral_unregistered_step_row: existing.uuid_corral_unregistered_step_row } });
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
        return created.get({ plain: true });
    }
    async listPendingAnimalRegistrations(ranchUuid) {
        const { CorralUnregisteredStepRowModel } = (0, tenant_request_context_1.requireTenantModels)();
        const sequelize = CorralUnregisteredStepRowModel.sequelize;
        if (!sequelize) {
            return [];
        }
        const ranchClause = ranchUuid ? 'AND s.ranch_uuid = :ranchUuid' : '';
        const rows = await sequelize.query(`
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
            `, {
            type: sequelize_1.QueryTypes.SELECT,
            replacements: ranchUuid ? { ranchUuid } : {},
        });
        return rows.map((row) => ({
            registration_number: row.registration_number,
            ranch_uuid: row.ranch_uuid,
            first_seen_at: toIsoString(row.first_seen_at),
            last_seen_at: toIsoString(row.last_seen_at),
            sessions: normalizePendingSessions(row.sessions),
        }));
    }
    async countFindings(sessionUuid) {
        const { CorralAnimalObservationModel, CorralAnimalVisualConditionModel, CorralAnimalAdditionalMedicationModel, CorralAnimalAdditionalTreatmentModel, } = (0, tenant_request_context_1.requireTenantModels)();
        const [o, v, m, t] = await Promise.all([
            CorralAnimalObservationModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalVisualConditionModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalAdditionalMedicationModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
            CorralAnimalAdditionalTreatmentModel.count({ where: { uuid_corral_work_session: sessionUuid, is_active: true } }),
        ]);
        return o + v + m + t;
    }
}
exports.default = CorralSessionRepository;
function toIsoString(value) {
    if (!value) {
        return '';
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
function normalizePendingSessions(value) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
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
