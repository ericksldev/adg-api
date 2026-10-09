"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const tenant_request_context_1 = require("../database/tenant/tenant-request-context");
const saas_plan_constants_1 = require("../constants/saas-plan.constants");
const corral_work_constants_1 = require("../constants/corral-work.constants");
const animal_identifier_util_1 = require("../utils/animal-identifier.util");
const ANIMAL_WORK_HISTORY_LIMIT = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class CorralWorkSessionService {
    constructor(repository, historySync, animalMovementService, saasPlanService) {
        this.repository = repository;
        this.historySync = historySync;
        this.animalMovementService = animalMovementService;
        this.saasPlanService = saasPlanService;
    }
    async getAll(params) {
        if (params.activity_code && !corral_work_constants_1.CORRAL_ACTIVITY_CODES.includes(params.activity_code)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Invalid activity: ${params.activity_code}`,
            });
        }
        const { rows, count } = await this.repository.findAllSessions(params);
        const data = await Promise.all(rows.map(async (row) => this.toDetail(row.get({ plain: true }))));
        return {
            success: true,
            data,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / params.size),
                currentPage: params.page,
                order: params.order,
                pageSize: params.size,
            },
        };
    }
    async listPendingAnimalRegistrations(ranchUuid) {
        const ranch = ranchUuid?.trim();
        if (ranch && !UUID_PATTERN.test(ranch)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'ranch_uuid is invalid',
            });
        }
        const data = await this.repository.listPendingAnimalRegistrations(ranch || undefined);
        return { success: true, data };
    }
    async getById(uuid) {
        const session = await this.requireSession(uuid);
        return { success: true, data: await this.toDetail(session.get({ plain: true })) };
    }
    async getWorkspace(uuid) {
        const session = await this.requireSession(uuid);
        const plain = session.get({ plain: true });
        const stepsWithActivities = await this.repository.findStepsWithActivities(uuid);
        if (stepsWithActivities.length === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Configure work steps before opening the workspace',
            });
        }
        const animals = await this.repository.findSessionAnimals(uuid);
        const paddockLabels = await this.animalMovementService.findCurrentPaddockLabels(animals.map((animal) => animal.animal_uuid));
        const sessionMoves = await this.animalMovementService.findSessionMoves(uuid);
        const grids = [];
        for (const { step, activities } of stepsWithActivities) {
            const gridActivities = activities.filter((code) => (0, corral_work_constants_1.isGridColumnActivity)(code));
            const stepAnimalUuids = await this.repository.findStepAnimalUuids(step.uuid_corral_session_step);
            const stepAnimals = animals.filter((animal) => stepAnimalUuids.has(animal.animal_uuid));
            const unregisteredRows = await this.repository.findUnregisteredStepRows(uuid, step.uuid_corral_session_step);
            const registeredNumbers = new Set(stepAnimals.map((animal) => animal.registration_number.toLowerCase()));
            const missingInventoryRows = unregisteredRows
                .filter((row) => !registeredNumbers.has(row.registration_number.toLowerCase()))
                .map((row) => ({
                animal_uuid: row.uuid_corral_unregistered_step_row,
                registration_number: row.registration_number,
                chip_number: null,
                missing_inventory: true,
                values: Object.fromEntries(gridActivities.map((code) => {
                    const key = code.toLowerCase();
                    return [key, row.cell_values?.[key] ?? null];
                })),
            }));
            const records = await this.repository.findActivityRecordsForStep(uuid, step.uuid_corral_session_step);
            const recordMap = new Map();
            for (const rec of records) {
                const colKey = rec.activity_code.toLowerCase();
                if (!recordMap.has(rec.animal_uuid)) {
                    recordMap.set(rec.animal_uuid, new Map());
                }
                const values = recordMap.get(rec.animal_uuid);
                const cellValue = this.recordToCellValue(rec);
                if ((0, corral_work_constants_1.isMultiRecordActivity)(rec.activity_code)) {
                    const textValue = cellValue == null ? null : String(cellValue);
                    if (!textValue)
                        continue;
                    const current = values.get(colKey);
                    if (Array.isArray(current)) {
                        current.push(textValue);
                    }
                    else if (current != null && current !== '') {
                        values.set(colKey, [String(current), textValue]);
                    }
                    else {
                        values.set(colKey, [textValue]);
                    }
                    continue;
                }
                values.set(colKey, cellValue);
            }
            grids.push({
                uuid_corral_session_step: step.uuid_corral_session_step,
                step_order: step.step_order,
                label: step.label,
                work_mode: step.work_mode,
                columns: this.buildColumns(gridActivities),
                animal_count: stepAnimals.length + missingInventoryRows.length,
                scanned_animal_uuids: await this.repository.findStepQueueScans(uuid, step.uuid_corral_session_step),
                rows: [
                    ...stepAnimals.map((animal) => {
                        const paddock = paddockLabels.get(animal.animal_uuid);
                        const sessionMove = sessionMoves.get(animal.animal_uuid);
                        return {
                            animal_uuid: animal.animal_uuid,
                            registration_number: animal.registration_number,
                            chip_number: animal.chip_number,
                            current_paddock_uuid: paddock?.current_paddock_uuid ?? null,
                            current_paddock_name: paddock?.current_paddock_name ?? null,
                            session_origin_paddock_name: sessionMove?.origin_paddock_name ?? null,
                            session_destination_paddock_name: sessionMove?.destination_paddock_name ?? null,
                            values: Object.fromEntries(gridActivities.map((code) => {
                                const key = code.toLowerCase();
                                const animalValues = recordMap.get(animal.animal_uuid);
                                let cellValue = animalValues?.get(key) ?? null;
                                if ((0, corral_work_constants_1.isPaddockMoveActivity)(code) && sessionMove?.destination_paddock_uuid) {
                                    cellValue = sessionMove.destination_paddock_uuid;
                                }
                                return [key, cellValue];
                            })),
                        };
                    }),
                    ...missingInventoryRows,
                ],
            });
        }
        return {
            success: true,
            data: {
                session: {
                    ...plain,
                    steps: stepsWithActivities.map(({ step, activities }) => ({
                        uuid_corral_session_step: step.uuid_corral_session_step,
                        step_order: step.step_order,
                        label: step.label,
                        work_mode: step.work_mode,
                        activities,
                    })),
                    animal_count: animals.length,
                },
                grids,
                findings_summary_count: await this.repository.countFindings(uuid),
            },
        };
    }
    async create(body) {
        this.validateCreateBody(body);
        const created = await this.repository.createSession({
            ranch_uuid: body.ranch_uuid,
            work_date: new Date(body.work_date),
            status: corral_work_constants_1.CorralWorkSessionStatus.DRAFT,
            notes: body.notes ?? null,
            responsible_person: body.responsible_person ?? null,
            created_by: body.created_by ?? null,
        });
        const sessionUuid = created.get('uuid_corral_work_session');
        const assignments = body.activity_assignments ?? [];
        if (assignments.length > 0) {
            await this.persistStepsAndActivities(sessionUuid, assignments);
        }
        return {
            success: true,
            data: await this.toDetail(created.get({ plain: true })),
        };
    }
    async configureWork(sessionUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot configure a closed session',
            });
        }
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot reconfigure work while session is in progress',
            });
        }
        this.validateConfigureBody(body);
        await this.repository.deactivateStepAnimals(sessionUuid);
        await this.repository.deactivateStepsAndActivities(sessionUuid);
        await this.persistConfiguredSteps(sessionUuid, body.steps);
        return this.getById(sessionUuid);
    }
    async extendWorkConfiguration(sessionUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot extend a closed session',
            });
        }
        this.validateConfigureBody(body);
        const currentSteps = await this.repository.findStepsWithActivities(sessionUuid);
        const currentByOrder = new Map(currentSteps.map((item) => [item.step.step_order, item]));
        const activityToStepOrder = new Map();
        for (const item of currentSteps) {
            for (const activityCode of item.activities) {
                activityToStepOrder.set(activityCode, item.step.step_order);
            }
        }
        const sortedSteps = [...body.steps].sort((a, b) => a.step_order - b.step_order);
        for (const stepPayload of sortedSteps) {
            const existing = currentByOrder.get(stepPayload.step_order);
            if (existing) {
                const existingActivities = new Set(existing.activities);
                for (const activityCode of stepPayload.activity_codes) {
                    if (existingActivities.has(activityCode)) {
                        continue;
                    }
                    if (activityToStepOrder.has(activityCode)) {
                        continue;
                    }
                    await this.repository.createStepActivity(existing.step.uuid_corral_session_step, activityCode);
                    existing.activities.push(activityCode);
                    activityToStepOrder.set(activityCode, stepPayload.step_order);
                }
                continue;
            }
            const activitiesToAdd = stepPayload.activity_codes.filter((activityCode) => !activityToStepOrder.has(activityCode));
            if (activitiesToAdd.length === 0) {
                continue;
            }
            const created = await this.repository.createStep(sessionUuid, stepPayload.step_order, stepPayload.label ?? null, this.resolveStepWorkMode(activitiesToAdd, stepPayload.work_mode));
            const stepUuid = created.get('uuid_corral_session_step');
            for (const activityCode of activitiesToAdd) {
                await this.repository.createStepActivity(stepUuid, activityCode);
                activityToStepOrder.set(activityCode, stepPayload.step_order);
            }
        }
        return this.getById(sessionUuid);
    }
    async scanStepAnimal(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        const identifier = (0, animal_identifier_util_1.normalizeAnimalIdentifier)(body.identifier ?? '');
        if (!identifier) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'identifier is required',
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        const ranchUuid = plain.ranch_uuid;
        const animal = await this.requireAnimalInSessionRanch(ranchUuid, identifier);
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        if (stepDef.step.work_mode === corral_work_constants_1.CorralStepWorkMode.SCAN_DYNAMIC) {
            await this.repository.ensureSessionAnimal(sessionUuid, animal, false);
            await this.repository.ensureStepAnimal(sessionUuid, stepUuid, animal.animal_uuid);
        }
        else {
            const stepAnimalUuids = await this.repository.findStepAnimalUuids(stepUuid);
            if (!stepAnimalUuids.has(animal.animal_uuid)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Animal is not part of this step list',
                });
            }
        }
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }
    async addUnregisteredStepAnimal(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        const identifier = (0, animal_identifier_util_1.normalizeAnimalIdentifier)(body.identifier ?? '');
        if (!identifier) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'identifier is required',
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        await this.repository.upsertUnregisteredStepRow(sessionUuid, stepUuid, identifier);
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }
    async previewAnimals(sessionUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid');
        this.validateAnimalsPreviewBody(body);
        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];
        const { merged, fromPaddocks, fromFilters, fromManual } = await this.repository.resolveAnimalsBySourceBreakdown(ranchUuid, paddocks, filters, manual);
        return {
            success: true,
            data: {
                total_count: merged.length,
                animals: merged,
                breakdown: {
                    from_paddocks: fromPaddocks.size,
                    from_filters: fromFilters.size,
                    from_manual: fromManual.size,
                },
            },
        };
    }
    async loadAnimals(sessionUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot load animals on a closed session',
            });
        }
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot replace animals while session is in progress',
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const preloadedSteps = stepsWithActivities.filter((item) => corral_work_constants_1.CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode));
        this.validateAnimalsLoadBody(body, preloadedSteps);
        const ranchUuid = plain.ranch_uuid;
        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];
        const { merged } = await this.repository.resolveAnimalsBySourceBreakdown(ranchUuid, paddocks, filters, manual);
        if (merged.length === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'No animals matched the selected sources',
            });
        }
        await this.repository.deactivateSessionSources(sessionUuid);
        await this.repository.deactivateSessionAnimals(sessionUuid);
        await this.repository.deactivateStepAnimals(sessionUuid);
        await this.persistSourcesFromLoadBody(sessionUuid, body);
        await this.repository.bulkCreateSessionAnimals(merged.map((a) => ({
            uuid_corral_work_session: sessionUuid,
            animal_uuid: a.animal_uuid,
            registration_number: a.registration_number,
            chip_number: a.chip_number ?? null,
            is_expected: true,
        })));
        this.validateStepAssignments(new Set(merged.map((a) => a.animal_uuid)), stepsWithActivities, body.step_assignments);
        const preloadedStepUuids = new Set(stepsWithActivities
            .filter((item) => corral_work_constants_1.CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode))
            .map((item) => item.step.uuid_corral_session_step));
        const stepAnimalRows = [];
        for (const assignment of body.step_assignments ?? []) {
            if (!preloadedStepUuids.has(assignment.uuid_corral_session_step)) {
                continue;
            }
            const uniqueAnimalUuids = [...new Set(assignment.animal_uuids ?? [])];
            for (const animalUuid of uniqueAnimalUuids) {
                stepAnimalRows.push({
                    uuid_corral_work_session: sessionUuid,
                    uuid_corral_session_step: assignment.uuid_corral_session_step,
                    animal_uuid: animalUuid,
                });
            }
        }
        await this.repository.bulkCreateStepAnimals(stepAnimalRows);
        const sourcesSaved = paddocks.length + filters.length + manual.length;
        return {
            success: true,
            data: {
                total_count: merged.length,
                sources_saved: sourcesSaved,
            },
        };
    }
    async updateStepWorkMode(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        if (!corral_work_constants_1.CORRAL_STEP_WORK_MODES.includes(body.work_mode)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Invalid work mode: ${body.work_mode}`,
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        await this.repository.updateStepWorkMode(stepUuid, body.work_mode);
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }
    async appendAnimalsToStep(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        this.validateAnimalsPreviewBody(body);
        const ranchUuid = plain.ranch_uuid;
        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];
        const { merged } = await this.repository.resolveAnimalsBySourceBreakdown(ranchUuid, paddocks, filters, manual);
        if (merged.length === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'No animals matched the selected sources',
            });
        }
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        await this.persistSourcesFromLoadBody(sessionUuid, body);
        const existingStepAnimalUuids = await this.repository.findStepAnimalUuids(stepUuid);
        let appendedCount = 0;
        for (const animal of merged) {
            if (existingStepAnimalUuids.has(animal.animal_uuid)) {
                continue;
            }
            await this.repository.ensureSessionAnimal(sessionUuid, animal, true);
            await this.repository.ensureStepAnimal(sessionUuid, stepUuid, animal.animal_uuid);
            appendedCount++;
        }
        if (appendedCount === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'All matched animals are already in this step',
            });
        }
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }
    async start(uuid) {
        const session = await this.requireSession(uuid);
        const status = session.get('status');
        const stepsWithActivities = await this.repository.findStepsWithActivities(uuid);
        if (stepsWithActivities.length === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Configure work steps before starting',
            });
        }
        if (status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Closed sessions cannot be started',
            });
        }
        if (status !== corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS) {
            await this.repository.updateSession(uuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        return this.getById(uuid);
    }
    async close(uuid) {
        const session = await this.requireSession(uuid);
        const plain = session.get({ plain: true });
        if (plain.status !== corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            await this.historySync.syncSessionOnClose(uuid, plain.ranch_uuid, new Date(plain.work_date));
            await this.repository.updateSession(uuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.CLOSED,
                closed_at: new Date(),
            });
        }
        return this.getById(uuid);
    }
    async saveStepGrid(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((s) => s.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        const unregisteredRows = await this.repository.findUnregisteredStepRows(sessionUuid, stepUuid);
        const unregisteredUuids = new Set(unregisteredRows.map((row) => row.uuid_corral_unregistered_step_row));
        const existingParticipations = await this.repository.findActiveParticipationKeys(sessionUuid, stepUuid);
        const additionalParticipations = this.countNewGridParticipations(existingParticipations, body.rows, stepDef.activities, unregisteredUuids);
        await this.assertActivityParticipationCapacity(additionalParticipations);
        for (const row of body.rows) {
            const registrationNumber = (0, animal_identifier_util_1.normalizeAnimalIdentifier)(row.registration_number ?? '');
            const isUnregistered = row.missing_inventory === true ||
                row.animal_uuid.startsWith('local-') ||
                unregisteredUuids.has(row.animal_uuid);
            if (isUnregistered) {
                if (!registrationNumber) {
                    throw new apiError_1.default({
                        name: 'ValidationError',
                        statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                        description: 'registration_number is required for records missing from inventory',
                    });
                }
                await this.repository.upsertUnregisteredStepRow(sessionUuid, stepUuid, registrationNumber, row.values);
                continue;
            }
            for (const activity of stepDef.activities) {
                const colKey = activity.toLowerCase();
                const raw = row.values[colKey];
                if ((0, corral_work_constants_1.isMultiRecordActivity)(activity)) {
                    const rawItems = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
                    const items = rawItems
                        .map((item) => (item == null ? '' : String(item).trim()))
                        .filter((item) => item.length > 0)
                        .map((text_value) => ({ text_value }));
                    await this.repository.replaceMultiActivityRecords(sessionUuid, stepUuid, row.animal_uuid, activity, items);
                    continue;
                }
                if (raw === undefined || raw === null || raw === '') {
                    continue;
                }
                if (Array.isArray(raw)) {
                    continue;
                }
                const payload = this.buildActivityPayload(sessionUuid, stepUuid, row.animal_uuid, activity, raw);
                await this.repository.upsertActivityRecord(payload);
                if (activity === corral_work_constants_1.CorralActivityCode.ATTENDANCE && payload.bool_value === true) {
                    await this.repository.updateSessionAnimalAttendance(sessionUuid, row.animal_uuid, true);
                }
            }
        }
        if (Array.isArray(body.scanned_animal_uuids)) {
            await this.repository.replaceStepQueueScans(sessionUuid, stepUuid, body.scanned_animal_uuids);
        }
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((g) => g.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }
    async lookupAnimal(sessionUuid, identifier) {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid');
        const animal = await this.requireAnimalInSessionRanch(ranchUuid, identifier);
        return {
            success: true,
            data: animal,
        };
    }
    async getAnimalWorkHistory(sessionUuid, animalUuid) {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid');
        if (!animalUuid?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'animal_uuid is required',
            });
        }
        const animal = await this.repository.findAnimalInRanchByUuid(ranchUuid, animalUuid.trim());
        if (!animal) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }
        const source = await this.repository.findAnimalWorkHistory(ranchUuid, animal.animal_uuid, sessionUuid, ANIMAL_WORK_HISTORY_LIMIT);
        return {
            success: true,
            data: {
                animal_uuid: animal.animal_uuid,
                registration_number: animal.registration_number,
                chip_number: animal.chip_number ?? null,
                profile: {
                    animal_uuid: animal.animal_uuid,
                    registration_number: animal.registration_number,
                    chip_number: animal.chip_number ?? null,
                    sex: animal.sex,
                    breed_code: animal.breed_code ?? null,
                    color: animal.color ?? null,
                    birth_date: this.toDateOnly(animal.birth_date),
                    origin_type: animal.origin_type,
                    paddock_name: animal.paddock_name ?? null,
                },
                sessions: this.buildAnimalWorkHistorySessions(source),
            },
        };
    }
    async upsertFinding(sessionUuid, body) {
        await this.requireSession(sessionUuid);
        if (!body.animal_uuid?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'animal_uuid is required',
            });
        }
        if (body.observation_text?.trim()) {
            await this.repository.upsertObservation(sessionUuid, body.animal_uuid, body.uuid_corral_session_step, body.observation_text.trim());
        }
        if (body.condition_code) {
            if (!corral_work_constants_1.CORRAL_VISUAL_CONDITION_CODES.includes(body.condition_code)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Invalid visual condition code',
                });
            }
            await this.repository.upsertVisualCondition(sessionUuid, body.animal_uuid, body.uuid_corral_session_step, body.condition_code);
        }
        if (body.additional_medications) {
            await this.repository.replaceAdditionalMedications(sessionUuid, body.animal_uuid, body.uuid_corral_session_step, body.additional_medications);
        }
        if (body.additional_treatments) {
            await this.repository.replaceAdditionalTreatments(sessionUuid, body.animal_uuid, body.uuid_corral_session_step, body.additional_treatments);
        }
        return { success: true, data: null };
    }
    async applyPaddockDistribution(sessionUuid, stepUuid, body) {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true });
        if (plain.status === corral_work_constants_1.CorralWorkSessionStatus.CLOSED) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }
        const moves = body.moves ?? [];
        if (!Array.isArray(moves)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'moves must be a list',
            });
        }
        for (const move of moves) {
            if (!UUID_PATTERN.test(move.animal_uuid ?? '') || !UUID_PATTERN.test(move.destination_paddock_uuid ?? '')) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Each move requires a valid animal and destination paddock',
                });
            }
        }
        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        if (!stepDef.activities.some((code) => (0, corral_work_constants_1.isPaddockMoveActivity)(code))) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'This step does not include paddock movement',
            });
        }
        const stepAnimalUuids = await this.repository.findStepAnimalUuids(stepUuid);
        const unknownAnimal = moves.find((move) => !stepAnimalUuids.has(move.animal_uuid));
        if (unknownAnimal) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'One or more animals are not part of this step',
            });
        }
        const sequelize = (0, tenant_request_context_1.requireTenantSequelize)();
        const applied = await sequelize.transaction(async (transaction) => {
            const result = await this.animalMovementService.applyDistribution({
                ranchUuid: plain.ranch_uuid,
                sessionUuid,
                movementDate: plain.work_date,
                moves,
            }, transaction);
            const existingParticipations = await this.repository.findActiveParticipationKeys(sessionUuid, stepUuid);
            let additionalParticipations = 0;
            for (const move of result.moved) {
                const key = `${move.animal_uuid}:${corral_work_constants_1.CorralActivityCode.PADDOCK_MOVE}`;
                if (!existingParticipations.has(key)) {
                    additionalParticipations += 1;
                    existingParticipations.add(key);
                }
            }
            await this.assertActivityParticipationCapacity(additionalParticipations);
            for (const move of result.moved) {
                await this.repository.upsertActivityRecord({
                    uuid_corral_work_session: sessionUuid,
                    uuid_corral_session_step: stepUuid,
                    animal_uuid: move.animal_uuid,
                    activity_code: corral_work_constants_1.CorralActivityCode.PADDOCK_MOVE,
                    bool_value: null,
                    numeric_value: null,
                    text_value: move.destination_paddock_uuid,
                    medicine_uuid: null,
                    dose: null,
                    unit: null,
                    identification_type: null,
                    weight_record_uuid: null,
                }, transaction);
            }
            return result;
        });
        if (applied.moved.length > 0 && plain.status === corral_work_constants_1.CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: corral_work_constants_1.CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        const refreshed = await this.requireSession(sessionUuid);
        return {
            success: true,
            data: {
                moved_count: applied.moved.length,
                capacity_warnings: applied.capacity_warnings,
                session_status: refreshed.get('status'),
                grid,
            },
        };
    }
    /**
     * Counts new animal-in-activity participations that this grid save will persist.
     * Updates of an existing participation, empty cells, and unregistered rows add nothing.
     * Unregistered step rows are not inventory animals and are not stored in corral_activity_records.
     * Observations and visual findings are not activity participations.
     */
    countNewGridParticipations(existing, rows, activities, unregisteredUuids) {
        const pending = new Set();
        for (const row of rows) {
            const isUnregistered = row.missing_inventory === true ||
                row.animal_uuid.startsWith('local-') ||
                unregisteredUuids.has(row.animal_uuid);
            if (isUnregistered) {
                continue;
            }
            for (const activity of activities) {
                const key = `${row.animal_uuid}:${activity}`;
                if (existing.has(key) || pending.has(key)) {
                    continue;
                }
                const raw = row.values[activity.toLowerCase()];
                if (!this.gridCellCreatesParticipation(activity, raw)) {
                    continue;
                }
                pending.add(key);
            }
        }
        return pending.size;
    }
    gridCellCreatesParticipation(activity, raw) {
        if ((0, corral_work_constants_1.isMultiRecordActivity)(activity)) {
            const rawItems = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
            return rawItems.some((item) => String(item ?? '').trim().length > 0);
        }
        if (raw === undefined || raw === null || raw === '') {
            return false;
        }
        return !Array.isArray(raw);
    }
    async assertActivityParticipationCapacity(additional) {
        if (additional <= 0) {
            return;
        }
        const uuidCompany = tenant_request_context_1.tenantRequestStorage.getStore()?.uuid_company;
        if (!uuidCompany) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Tenant operational context is not initialized for this request',
            });
        }
        const limit = await this.saasPlanService.getResourceLimit(uuidCompany, saas_plan_constants_1.SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS);
        const current = await this.repository.countActiveActivityParticipations();
        if (current + additional > limit) {
            throw new apiError_1.default({
                name: 'PlanActivityRecordLimitReached',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Yearly activity limit reached for this company (${limit})`,
            });
        }
    }
    resolveStepWorkMode(activities, requested) {
        if (requested && corral_work_constants_1.CORRAL_STEP_WORK_MODES.includes(requested)) {
            return requested;
        }
        if (activities.length === 1 && (0, corral_work_constants_1.isPaddockMoveActivity)(activities[0])) {
            return corral_work_constants_1.CorralStepWorkMode.PRELOADED_SEARCH;
        }
        return corral_work_constants_1.CorralStepWorkMode.SCAN_DYNAMIC;
    }
    validateCreateBody(body) {
        if (!body.ranch_uuid?.trim()) {
            throw new apiError_1.default({ name: 'ValidationError', statusCode: httpStatusCodes_1.default.BAD_REQUEST, description: 'ranch_uuid is required' });
        }
        if (!body.work_date?.trim()) {
            throw new apiError_1.default({ name: 'ValidationError', statusCode: httpStatusCodes_1.default.BAD_REQUEST, description: 'work_date is required' });
        }
        const assignments = body.activity_assignments ?? [];
        for (const item of assignments) {
            if (!corral_work_constants_1.CORRAL_ACTIVITY_CODES.includes(item.activity_code)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: `Invalid activity: ${item.activity_code}`,
                });
            }
            if (!item.step_order || item.step_order < 1) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'step_order must be >= 1',
                });
            }
        }
    }
    validateConfigureBody(body) {
        const steps = body.steps ?? [];
        if (steps.length === 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'At least one step is required',
            });
        }
        const stepOrders = new Set();
        for (const step of steps) {
            if (!step.step_order || step.step_order < 1) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'step_order must be >= 1',
                });
            }
            if (stepOrders.has(step.step_order)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Duplicate step_order in configuration',
                });
            }
            stepOrders.add(step.step_order);
            if (!corral_work_constants_1.CORRAL_STEP_WORK_MODES.includes(step.work_mode ?? corral_work_constants_1.CorralStepWorkMode.SCAN_DYNAMIC)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: `Invalid work mode: ${step.work_mode}`,
                });
            }
            const activityCodes = step.activity_codes ?? [];
            if (activityCodes.length === 0) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Each step must include at least one activity',
                });
            }
            for (const code of activityCodes) {
                if (!corral_work_constants_1.CORRAL_ACTIVITY_CODES.includes(code)) {
                    throw new apiError_1.default({
                        name: 'ValidationError',
                        statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                        description: `Invalid activity: ${code}`,
                    });
                }
            }
        }
    }
    validateAnimalsPreviewBody(body) {
        const hasSource = (body.source_paddock_uuids?.length ?? 0) > 0 ||
            (body.source_filters?.length ?? 0) > 0 ||
            (body.manual_animal_uuids?.length ?? 0) > 0;
        if (!hasSource) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'At least one animal source is required (paddock, category filter, or manual)',
            });
        }
    }
    validateAnimalsLoadBody(body, preloadedSteps) {
        const hasSource = (body.source_paddock_uuids?.length ?? 0) > 0 ||
            (body.source_filters?.length ?? 0) > 0 ||
            (body.manual_animal_uuids?.length ?? 0) > 0;
        if (!hasSource) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'At least one animal source is required (paddock, category filter, or manual)',
            });
        }
        if (preloadedSteps.length > 0 && !body.step_assignments?.length) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Step animal assignments are required for preloaded steps',
            });
        }
    }
    validateStepAssignments(loadedAnimalUuids, stepsWithActivities, assignments) {
        const preloadedSteps = stepsWithActivities.filter((item) => corral_work_constants_1.CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode));
        if (preloadedSteps.length === 0) {
            return;
        }
        const validStepUuids = new Set(preloadedSteps.map((item) => item.step.uuid_corral_session_step));
        const animalsAssignedToPreloadedStep = new Set();
        for (const assignment of assignments ?? []) {
            if (!validStepUuids.has(assignment.uuid_corral_session_step)) {
                continue;
            }
            for (const animalUuid of assignment.animal_uuids ?? []) {
                if (!loadedAnimalUuids.has(animalUuid)) {
                    throw new apiError_1.default({
                        name: 'ValidationError',
                        statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                        description: 'Assigned animal is not part of the loaded set',
                    });
                }
                animalsAssignedToPreloadedStep.add(animalUuid);
            }
        }
        for (const animalUuid of loadedAnimalUuids) {
            if (!animalsAssignedToPreloadedStep.has(animalUuid)) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Every loaded animal must be assigned to at least one preloaded step',
                });
            }
        }
    }
    async persistSourcesFromLoadBody(sessionUuid, body) {
        for (const paddockUuid of body.source_paddock_uuids ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: corral_work_constants_1.CorralSessionSourceType.PADDOCK,
                paddock_uuid: paddockUuid,
            });
        }
        for (const filter of body.source_filters ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: corral_work_constants_1.CorralSessionSourceType.FILTER,
                filter_key: filter.filter_key,
                filter_value: filter.filter_value,
            });
        }
        for (const animalUuid of body.manual_animal_uuids ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: corral_work_constants_1.CorralSessionSourceType.MANUAL,
                animal_uuid: animalUuid,
            });
        }
    }
    async persistConfiguredSteps(sessionUuid, steps) {
        const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
        for (const step of sorted) {
            const created = await this.repository.createStep(sessionUuid, step.step_order, step.label ?? null, this.resolveStepWorkMode(step.activity_codes, step.work_mode));
            const stepUuid = created.get('uuid_corral_session_step');
            for (const activityCode of step.activity_codes) {
                await this.repository.createStepActivity(stepUuid, activityCode);
            }
        }
    }
    async persistStepsAndActivities(sessionUuid, assignments) {
        const stepOrders = [...new Set(assignments.map((a) => a.step_order))].sort((a, b) => a - b);
        const stepUuidByOrder = new Map();
        for (const order of stepOrders) {
            const step = await this.repository.createStep(sessionUuid, order);
            stepUuidByOrder.set(order, step.get('uuid_corral_session_step'));
        }
        for (const assignment of assignments) {
            const stepUuid = stepUuidByOrder.get(assignment.step_order);
            if (!stepUuid)
                continue;
            await this.repository.createStepActivity(stepUuid, assignment.activity_code);
        }
    }
    async toDetail(session) {
        const stepsWithActivities = await this.repository.findStepsWithActivities(session.uuid_corral_work_session);
        const sources = await this.repository.findSources(session.uuid_corral_work_session);
        const planned_activities = stepsWithActivities.flatMap((s) => s.activities);
        const animalCount = await this.repository.countSessionAnimals(session.uuid_corral_work_session);
        return {
            ...session,
            steps: stepsWithActivities.map(({ step, activities }) => ({
                uuid_corral_session_step: step.uuid_corral_session_step,
                step_order: step.step_order,
                label: step.label,
                work_mode: step.work_mode,
                activities,
            })),
            sources,
            planned_activities,
            animal_count: animalCount,
            animals_loaded: true,
            work_configured: stepsWithActivities.length > 0,
            requires_animal_load: false,
        };
    }
    async requireAnimalInSessionRanch(ranchUuid, identifier) {
        const animal = await this.repository.findAnimalInRanchByIdentifier(ranchUuid, identifier);
        if (animal) {
            return animal;
        }
        const fallback = await this.repository.findActiveAnimalByIdentifier(identifier);
        if (fallback && fallback.ranch_uuid !== ranchUuid) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }
        throw new apiError_1.default({
            name: 'NotFound',
            statusCode: httpStatusCodes_1.default.NOT_FOUND,
            description: 'Animal not found for this ranch',
        });
    }
    async requireSession(uuid) {
        if (!uuid?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Corral work session id is required',
            });
        }
        const session = await this.repository.findSessionById(uuid);
        if (!session) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Corral work session not found',
            });
        }
        return session;
    }
    buildAnimalWorkHistorySessions(source) {
        const recordsBySession = this.groupBySession(source.records);
        const observationsBySession = this.groupBySession(source.observations);
        const conditionsBySession = this.groupBySession(source.conditions);
        const medicationsBySession = this.groupBySession(source.medications);
        const treatmentsBySession = this.groupBySession(source.treatments);
        return source.sessions.flatMap((session) => {
            const sessionUuid = session.uuid_corral_work_session;
            const activities = this.summarizeActivityRecords(recordsBySession.get(sessionUuid) ?? []);
            const observations = (observationsBySession.get(sessionUuid) ?? [])
                .map((item) => item.observation_text.trim())
                .filter((text) => text.length > 0);
            const condition_codes = [
                ...new Set((conditionsBySession.get(sessionUuid) ?? []).map((item) => item.condition_code)),
            ];
            const medications = (medicationsBySession.get(sessionUuid) ?? [])
                .map((item) => this.joinDisplayParts(item.product_name, item.dose, item.unit))
                .filter((text) => text.length > 0);
            const treatments = (treatmentsBySession.get(sessionUuid) ?? [])
                .map((item) => this.joinDisplayParts(item.treatment_type, item.description))
                .filter((text) => text.length > 0);
            if (activities.length === 0 &&
                observations.length === 0 &&
                condition_codes.length === 0 &&
                medications.length === 0 &&
                treatments.length === 0) {
                return [];
            }
            return [
                {
                    uuid_corral_work_session: sessionUuid,
                    work_date: this.toDateOnly(session.work_date),
                    status: session.status,
                    responsible_person: session.responsible_person ?? null,
                    activities,
                    observations,
                    condition_codes,
                    medications,
                    treatments,
                },
            ];
        });
    }
    summarizeActivityRecords(records) {
        const valuesByCode = new Map();
        for (const record of records) {
            const value = this.formatActivityRecordValue(record);
            if (!value)
                continue;
            const current = valuesByCode.get(record.activity_code) ?? [];
            current.push(value);
            valuesByCode.set(record.activity_code, current);
        }
        return [...valuesByCode.entries()]
            .sort(([left], [right]) => this.activitySortIndex(left) - this.activitySortIndex(right))
            .map(([activity_code, values]) => ({ activity_code, values }));
    }
    formatActivityRecordValue(record) {
        if (record.activity_code === corral_work_constants_1.CorralActivityCode.ATTENDANCE) {
            if (record.bool_value == null)
                return null;
            return record.bool_value ? 'true' : 'false';
        }
        if (record.activity_code === corral_work_constants_1.CorralActivityCode.WEIGHING) {
            if (record.numeric_value == null)
                return null;
            return this.formatHistoryNumber(record.numeric_value);
        }
        const text = this.joinDisplayParts(record.text_value, record.dose, record.unit);
        return text || null;
    }
    joinDisplayParts(...parts) {
        return parts
            .map((part) => (part ?? '').trim())
            .filter((part) => part.length > 0)
            .join(' ');
    }
    formatHistoryNumber(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric))
            return String(value);
        return numeric.toFixed(2).replace(/\.?0+$/, '');
    }
    activitySortIndex(code) {
        const index = corral_work_constants_1.CORRAL_ACTIVITY_CODES.indexOf(code);
        return index === -1 ? corral_work_constants_1.CORRAL_ACTIVITY_CODES.length : index;
    }
    toDateOnly(value) {
        if (typeof value === 'string')
            return value.slice(0, 10);
        return value.toISOString().slice(0, 10);
    }
    groupBySession(rows) {
        const grouped = new Map();
        for (const row of rows) {
            const current = grouped.get(row.uuid_corral_work_session) ?? [];
            current.push(row);
            grouped.set(row.uuid_corral_work_session, current);
        }
        return grouped;
    }
    buildColumns(codes) {
        const columns = [];
        for (const code of codes) {
            if ((0, corral_work_constants_1.isPaddockMoveActivity)(code)) {
                columns.push({
                    activity_code: code,
                    column_key: 'paddock_current',
                    label: 'Current paddock',
                    value_type: 'paddock_current',
                });
                columns.push({
                    activity_code: code,
                    column_key: code.toLowerCase(),
                    label: 'Destination paddock',
                    value_type: 'paddock_destination',
                });
                continue;
            }
            columns.push(this.buildColumn(code));
        }
        return columns;
    }
    buildColumn(code) {
        return {
            activity_code: code,
            column_key: code.toLowerCase(),
            label: corral_work_constants_1.CORRAL_ACTIVITY_COLUMN_LABELS[code],
            value_type: corral_work_constants_1.CORRAL_ACTIVITY_VALUE_TYPES[code],
        };
    }
    recordToCellValue(rec) {
        switch (rec.activity_code) {
            case corral_work_constants_1.CorralActivityCode.ATTENDANCE:
                return rec.bool_value ?? null;
            case corral_work_constants_1.CorralActivityCode.WEIGHING:
                return rec.numeric_value != null ? Number(rec.numeric_value) : null;
            default:
                return rec.text_value ?? rec.medicine_uuid ?? null;
        }
    }
    buildActivityPayload(sessionUuid, stepUuid, animalUuid, activity, raw) {
        const base = {
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid,
            animal_uuid: animalUuid,
            activity_code: activity,
            bool_value: null,
            numeric_value: null,
            text_value: null,
            medicine_uuid: null,
            dose: null,
            unit: null,
            identification_type: null,
            weight_record_uuid: null,
        };
        switch (activity) {
            case corral_work_constants_1.CorralActivityCode.ATTENDANCE:
                base.bool_value = raw === true || raw === 'true' || raw === 1 || raw === '1';
                break;
            case corral_work_constants_1.CorralActivityCode.WEIGHING:
                base.numeric_value = typeof raw === 'number' ? raw : Number(raw);
                break;
            case corral_work_constants_1.CorralActivityCode.IDENTIFICATION:
                base.text_value = String(raw);
                base.identification_type = 'ear_tag';
                break;
            case corral_work_constants_1.CorralActivityCode.VACCINATION:
            case corral_work_constants_1.CorralActivityCode.DEWORMING:
                base.text_value = String(raw);
                break;
            default:
                base.text_value = String(raw);
        }
        return base;
    }
}
exports.default = CorralWorkSessionService;
