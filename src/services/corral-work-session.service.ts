import { ServiceResponse } from '../interfaces/common/service-response.interface';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import CorralSessionRepository, { CorralWorkSessionListParams } from '../repositories/corral-session.repository';
import CorralSessionHistorySyncService from './corral-session-history-sync.service';
import AnimalMovementService from './animal-movement.service';
import SaasPlanService from './saas-plan.service';
import { requireTenantSequelize, tenantRequestStorage } from '../database/tenant/tenant-request-context';
import { SAAS_PLAN_RESOURCE } from '../constants/saas-plan.constants';
import {
    CorralActivityAssignmentInput,
    ConfigureCorralWorkBody,
    CorralSessionAnimalsLoadBody,
    CorralSessionAnimalsLoadResultDto,
    CorralSessionAnimalsPreviewDto,
    CorralSessionDetailDto,
    CorralSessionWorkspaceDto,
    CorralStepGridColumnDto,
    CorralStepGridDto,
    CorralWorkSessionAttributes,
    CreateCorralWorkSessionBody,
    SaveCorralStepGridBody,
    ScanCorralStepAnimalBody,
    UpsertCorralFindingBody,
    UpdateCorralStepWorkModeBody,
    AppendCorralStepAnimalsBody,
    AnimalCorralWorkHistoryDto,
    AnimalCorralWorkHistorySessionDto,
    AnimalWorkHistorySource,
    CorralActivityRecordAttributes,
    PendingAnimalRegistrationDto,
    ApplyPaddockDistributionBody,
    ApplyPaddockDistributionResultDto,
} from '../interfaces/corral-session/corral-session.interface';
import {
    CORRAL_ACTIVITY_CODES,
    CORRAL_ACTIVITY_COLUMN_LABELS,
    CORRAL_ACTIVITY_VALUE_TYPES,
    CORRAL_PRELOADED_WORK_MODES,
    CORRAL_STEP_WORK_MODES,
    CorralActivityCode,
    CorralSessionSourceType,
    CorralStepWorkMode,
    isGridColumnActivity,
    isMultiRecordActivity,
    isPaddockMoveActivity,
    CorralVisualConditionCode,
    CorralWorkSessionStatus,
    CORRAL_VISUAL_CONDITION_CODES,
} from '../constants/corral-work.constants';
import { AnimalAttributes } from '../interfaces/animal/animal.interface';
import { normalizeAnimalIdentifier } from '../utils/animal-identifier.util';

const ANIMAL_WORK_HISTORY_LIMIT = 10;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CorralWorkSessionService {
    private readonly repository: CorralSessionRepository;
    private readonly historySync: CorralSessionHistorySyncService;
    private readonly animalMovementService: AnimalMovementService;
    private readonly saasPlanService: SaasPlanService;

    constructor(
        repository: CorralSessionRepository,
        historySync: CorralSessionHistorySyncService,
        animalMovementService: AnimalMovementService,
        saasPlanService: SaasPlanService
    ) {
        this.repository = repository;
        this.historySync = historySync;
        this.animalMovementService = animalMovementService;
        this.saasPlanService = saasPlanService;
    }

    async getAll(params: CorralWorkSessionListParams): Promise<ServiceResponse<CorralSessionDetailDto[]>> {
        if (params.activity_code && !CORRAL_ACTIVITY_CODES.includes(params.activity_code)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Invalid activity: ${params.activity_code}`,
            });
        }

        const { rows, count } = await this.repository.findAllSessions(params);
        const data = await Promise.all(
            rows.map(async (row) => this.toDetail(row.get({ plain: true }) as CorralWorkSessionAttributes))
        );
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

    async listPendingAnimalRegistrations(
        ranchUuid?: string
    ): Promise<ServiceResponse<PendingAnimalRegistrationDto[]>> {
        const ranch = ranchUuid?.trim();
        if (ranch && !UUID_PATTERN.test(ranch)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'ranch_uuid is invalid',
            });
        }

        const data = await this.repository.listPendingAnimalRegistrations(ranch || undefined);
        return { success: true, data };
    }

    async getById(uuid: string): Promise<ServiceResponse<CorralSessionDetailDto>> {
        const session = await this.requireSession(uuid);
        return { success: true, data: await this.toDetail(session.get({ plain: true }) as CorralWorkSessionAttributes) };
    }

    async getWorkspace(uuid: string): Promise<ServiceResponse<CorralSessionWorkspaceDto>> {
        const session = await this.requireSession(uuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        const stepsWithActivities = await this.repository.findStepsWithActivities(uuid);
        if (stepsWithActivities.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Configure work steps before opening the workspace',
            });
        }

        const animals = await this.repository.findSessionAnimals(uuid);
        const paddockLabels = await this.animalMovementService.findCurrentPaddockLabels(
            animals.map((animal) => animal.animal_uuid)
        );
        const sessionMoves = await this.animalMovementService.findSessionMoves(uuid);
        const grids: CorralStepGridDto[] = [];

        for (const { step, activities } of stepsWithActivities) {
            const gridActivities = activities.filter((code) => isGridColumnActivity(code));
            const stepAnimalUuids = await this.repository.findStepAnimalUuids(step.uuid_corral_session_step);
            const stepAnimals = animals.filter((animal) => stepAnimalUuids.has(animal.animal_uuid));

            const unregisteredRows = await this.repository.findUnregisteredStepRows(
                uuid,
                step.uuid_corral_session_step
            );
            const registeredNumbers = new Set(
                stepAnimals.map((animal) => animal.registration_number.toLowerCase())
            );
            const missingInventoryRows = unregisteredRows
                .filter((row) => !registeredNumbers.has(row.registration_number.toLowerCase()))
                .map((row) => ({
                    animal_uuid: row.uuid_corral_unregistered_step_row,
                    registration_number: row.registration_number,
                    chip_number: null,
                    missing_inventory: true,
                    values: Object.fromEntries(
                        gridActivities.map((code) => {
                            const key = code.toLowerCase();
                            return [key, row.cell_values?.[key] ?? null];
                        })
                    ),
                }));

            const records = await this.repository.findActivityRecordsForStep(uuid, step.uuid_corral_session_step);
            const recordMap = new Map<string, Map<string, string | number | boolean | string[] | null>>();
            for (const rec of records) {
                const colKey = rec.activity_code.toLowerCase();
                if (!recordMap.has(rec.animal_uuid)) {
                    recordMap.set(rec.animal_uuid, new Map());
                }
                const values = recordMap.get(rec.animal_uuid)!;
                const cellValue = this.recordToCellValue(rec);
                if (isMultiRecordActivity(rec.activity_code)) {
                    const textValue = cellValue == null ? null : String(cellValue);
                    if (!textValue) continue;
                    const current = values.get(colKey);
                    if (Array.isArray(current)) {
                        current.push(textValue);
                    } else if (current != null && current !== '') {
                        values.set(colKey, [String(current), textValue]);
                    } else {
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
                scanned_animal_uuids: await this.repository.findStepQueueScans(
                    uuid,
                    step.uuid_corral_session_step
                ),
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
                            values: Object.fromEntries(
                                gridActivities.map((code) => {
                                    const key = code.toLowerCase();
                                    const animalValues = recordMap.get(animal.animal_uuid);
                                    let cellValue = animalValues?.get(key) ?? null;
                                    if (isPaddockMoveActivity(code) && sessionMove?.destination_paddock_uuid) {
                                        cellValue = sessionMove.destination_paddock_uuid;
                                    }
                                    return [key, cellValue];
                                })
                            ),
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

    async create(body: CreateCorralWorkSessionBody): Promise<ServiceResponse<CorralSessionDetailDto>> {
        this.validateCreateBody(body);

        const created = await this.repository.createSession({
            ranch_uuid: body.ranch_uuid,
            work_date: new Date(body.work_date),
            status: CorralWorkSessionStatus.DRAFT,
            notes: body.notes ?? null,
            responsible_person: body.responsible_person ?? null,
            created_by: body.created_by ?? null,
        });

        const sessionUuid = created.get('uuid_corral_work_session') as string;
        const assignments = body.activity_assignments ?? [];
        if (assignments.length > 0) {
            await this.persistStepsAndActivities(sessionUuid, assignments);
        }

        return {
            success: true,
            data: await this.toDetail(created.get({ plain: true }) as CorralWorkSessionAttributes),
        };
    }

    async configureWork(
        sessionUuid: string,
        body: ConfigureCorralWorkBody
    ): Promise<ServiceResponse<CorralSessionDetailDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot configure a closed session',
            });
        }
        if (plain.status === CorralWorkSessionStatus.IN_PROGRESS) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot reconfigure work while session is in progress',
            });
        }

        this.validateConfigureBody(body);
        await this.repository.deactivateStepAnimals(sessionUuid);
        await this.repository.deactivateStepsAndActivities(sessionUuid);
        await this.persistConfiguredSteps(sessionUuid, body.steps);

        return this.getById(sessionUuid);
    }

    async extendWorkConfiguration(
        sessionUuid: string,
        body: ConfigureCorralWorkBody
    ): Promise<ServiceResponse<CorralSessionDetailDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot extend a closed session',
            });
        }

        this.validateConfigureBody(body);

        const currentSteps = await this.repository.findStepsWithActivities(sessionUuid);
        const currentByOrder = new Map(
            currentSteps.map((item) => [item.step.step_order, item])
        );
        const activityToStepOrder = new Map<CorralActivityCode, number>();
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
                    await this.repository.createStepActivity(
                        existing.step.uuid_corral_session_step,
                        activityCode
                    );
                    existing.activities.push(activityCode);
                    activityToStepOrder.set(activityCode, stepPayload.step_order);
                }
                continue;
            }

            const activitiesToAdd = stepPayload.activity_codes.filter(
                (activityCode) => !activityToStepOrder.has(activityCode)
            );
            if (activitiesToAdd.length === 0) {
                continue;
            }

            const created = await this.repository.createStep(
                sessionUuid,
                stepPayload.step_order,
                stepPayload.label ?? null,
                this.resolveStepWorkMode(activitiesToAdd, stepPayload.work_mode)
            );
            const stepUuid = created.get('uuid_corral_session_step') as string;
            for (const activityCode of activitiesToAdd) {
                await this.repository.createStepActivity(stepUuid, activityCode);
                activityToStepOrder.set(activityCode, stepPayload.step_order);
            }
        }

        return this.getById(sessionUuid);
    }

    async scanStepAnimal(
        sessionUuid: string,
        stepUuid: string,
        body: ScanCorralStepAnimalBody
    ): Promise<ServiceResponse<CorralStepGridDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        const identifier = normalizeAnimalIdentifier(body.identifier ?? '');
        if (!identifier) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'identifier is required',
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }

        const ranchUuid = plain.ranch_uuid;
        const animal = await this.requireAnimalInSessionRanch(ranchUuid, identifier);

        if (plain.status === CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }

        if (stepDef.step.work_mode === CorralStepWorkMode.SCAN_DYNAMIC) {
            await this.repository.ensureSessionAnimal(sessionUuid, animal, false);
            await this.repository.ensureStepAnimal(sessionUuid, stepUuid, animal.animal_uuid);
        } else {
            const stepAnimalUuids = await this.repository.findStepAnimalUuids(stepUuid);
            if (!stepAnimalUuids.has(animal.animal_uuid)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Animal is not part of this step list',
                });
            }
        }

        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }

    async addUnregisteredStepAnimal(
        sessionUuid: string,
        stepUuid: string,
        body: ScanCorralStepAnimalBody
    ): Promise<ServiceResponse<CorralStepGridDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        const identifier = normalizeAnimalIdentifier(body.identifier ?? '');
        if (!identifier) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'identifier is required',
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }

        if (plain.status === CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }

        await this.repository.upsertUnregisteredStepRow(sessionUuid, stepUuid, identifier);

        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }

    async previewAnimals(
        sessionUuid: string,
        body: CorralSessionAnimalsLoadBody
    ): Promise<ServiceResponse<CorralSessionAnimalsPreviewDto>> {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid') as string;
        this.validateAnimalsPreviewBody(body);

        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];

        const { merged, fromPaddocks, fromFilters, fromManual } =
            await this.repository.resolveAnimalsBySourceBreakdown(ranchUuid, paddocks, filters, manual);

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

    async loadAnimals(
        sessionUuid: string,
        body: CorralSessionAnimalsLoadBody
    ): Promise<ServiceResponse<CorralSessionAnimalsLoadResultDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;

        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot load animals on a closed session',
            });
        }

        if (plain.status === CorralWorkSessionStatus.IN_PROGRESS) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot replace animals while session is in progress',
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const preloadedSteps = stepsWithActivities.filter((item) =>
            CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode)
        );
        this.validateAnimalsLoadBody(body, preloadedSteps);

        const ranchUuid = plain.ranch_uuid;
        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];

        const { merged } = await this.repository.resolveAnimalsBySourceBreakdown(
            ranchUuid,
            paddocks,
            filters,
            manual
        );

        if (merged.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'No animals matched the selected sources',
            });
        }

        await this.repository.deactivateSessionSources(sessionUuid);
        await this.repository.deactivateSessionAnimals(sessionUuid);
        await this.repository.deactivateStepAnimals(sessionUuid);
        await this.persistSourcesFromLoadBody(sessionUuid, body);
        await this.repository.bulkCreateSessionAnimals(
            merged.map((a) => ({
                uuid_corral_work_session: sessionUuid,
                animal_uuid: a.animal_uuid,
                registration_number: a.registration_number,
                chip_number: a.chip_number ?? null,
                is_expected: true,
            }))
        );

        this.validateStepAssignments(
            new Set(merged.map((a) => a.animal_uuid)),
            stepsWithActivities,
            body.step_assignments
        );

        const preloadedStepUuids = new Set(
            stepsWithActivities
                .filter((item) => CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode))
                .map((item) => item.step.uuid_corral_session_step)
        );
        const stepAnimalRows: Array<{
            uuid_corral_work_session: string;
            uuid_corral_session_step: string;
            animal_uuid: string;
        }> = [];
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

        const sourcesSaved =
            paddocks.length + filters.length + manual.length;

        return {
            success: true,
            data: {
                total_count: merged.length,
                sources_saved: sourcesSaved,
            },
        };
    }

    async updateStepWorkMode(
        sessionUuid: string,
        stepUuid: string,
        body: UpdateCorralStepWorkModeBody
    ): Promise<ServiceResponse<CorralStepGridDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        if (!CORRAL_STEP_WORK_MODES.includes(body.work_mode)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Invalid work mode: ${body.work_mode}`,
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }

        await this.repository.updateStepWorkMode(stepUuid, body.work_mode);

        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }

    async appendAnimalsToStep(
        sessionUuid: string,
        stepUuid: string,
        body: AppendCorralStepAnimalsBody
    ): Promise<ServiceResponse<CorralStepGridDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }

        this.validateAnimalsPreviewBody(body);

        const ranchUuid = plain.ranch_uuid;
        const paddocks = body.source_paddock_uuids ?? [];
        const filters = body.source_filters ?? [];
        const manual = body.manual_animal_uuids ?? [];

        const { merged } = await this.repository.resolveAnimalsBySourceBreakdown(
            ranchUuid,
            paddocks,
            filters,
            manual
        );

        if (merged.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'No animals matched the selected sources',
            });
        }

        if (plain.status === CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
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
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'All matched animals are already in this step',
            });
        }

        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }

    async start(uuid: string): Promise<ServiceResponse<CorralSessionDetailDto>> {
        const session = await this.requireSession(uuid);
        const status = session.get('status') as CorralWorkSessionStatus;
        const stepsWithActivities = await this.repository.findStepsWithActivities(uuid);
        if (stepsWithActivities.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Configure work steps before starting',
            });
        }

        if (status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Closed sessions cannot be started',
            });
        }
        if (status !== CorralWorkSessionStatus.IN_PROGRESS) {
            await this.repository.updateSession(uuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }
        return this.getById(uuid);
    }

    async close(uuid: string): Promise<ServiceResponse<CorralSessionDetailDto>> {
        const session = await this.requireSession(uuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status !== CorralWorkSessionStatus.CLOSED) {
            await this.historySync.syncSessionOnClose(uuid, plain.ranch_uuid, new Date(plain.work_date));
            await this.repository.updateSession(uuid, {
                status: CorralWorkSessionStatus.CLOSED,
                closed_at: new Date(),
            });
        }
        return this.getById(uuid);
    }

    async saveStepGrid(
        sessionUuid: string,
        stepUuid: string,
        body: SaveCorralStepGridBody
    ): Promise<ServiceResponse<CorralStepGridDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        if (plain.status === CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((s) => s.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }

        const unregisteredRows = await this.repository.findUnregisteredStepRows(sessionUuid, stepUuid);
        const unregisteredUuids = new Set(unregisteredRows.map((row) => row.uuid_corral_unregistered_step_row));

        const existingParticipations = await this.repository.findActiveParticipationKeys(sessionUuid, stepUuid);
        const additionalParticipations = this.countNewGridParticipations(
            existingParticipations,
            body.rows,
            stepDef.activities,
            unregisteredUuids
        );
        await this.assertActivityParticipationCapacity(additionalParticipations);

        for (const row of body.rows) {
            const registrationNumber = normalizeAnimalIdentifier(row.registration_number ?? '');
            const isUnregistered =
                row.missing_inventory === true ||
                row.animal_uuid.startsWith('local-') ||
                unregisteredUuids.has(row.animal_uuid);

            if (isUnregistered) {
                if (!registrationNumber) {
                    throw new ApiError({
                        name: 'ValidationError',
                        statusCode: HttpStatusCodes.BAD_REQUEST,
                        description: 'registration_number is required for records missing from inventory',
                    });
                }
                await this.repository.upsertUnregisteredStepRow(
                    sessionUuid,
                    stepUuid,
                    registrationNumber,
                    row.values
                );
                continue;
            }

            for (const activity of stepDef.activities) {
                const colKey = activity.toLowerCase();
                const raw = row.values[colKey];

                if (isMultiRecordActivity(activity)) {
                    const rawItems = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
                    const items = rawItems
                        .map((item) => (item == null ? '' : String(item).trim()))
                        .filter((item) => item.length > 0)
                        .map((text_value) => ({ text_value }));
                    await this.repository.replaceMultiActivityRecords(
                        sessionUuid,
                        stepUuid,
                        row.animal_uuid,
                        activity,
                        items
                    );
                    continue;
                }

                if (raw === undefined || raw === null || raw === '') {
                    continue;
                }
                if (Array.isArray(raw)) {
                    continue;
                }

                const payload = this.buildActivityPayload(
                    sessionUuid,
                    stepUuid,
                    row.animal_uuid,
                    activity,
                    raw
                );
                await this.repository.upsertActivityRecord(payload);

                if (activity === CorralActivityCode.ATTENDANCE && payload.bool_value === true) {
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
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }
        return { success: true, data: grid };
    }

    async lookupAnimal(sessionUuid: string, identifier: string): Promise<ServiceResponse<AnimalAttributes>> {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid') as string;
        const animal = await this.requireAnimalInSessionRanch(ranchUuid, identifier);
        return {
            success: true,
            data: animal as unknown as AnimalAttributes,
        };
    }

    async getAnimalWorkHistory(
        sessionUuid: string,
        animalUuid: string
    ): Promise<ServiceResponse<AnimalCorralWorkHistoryDto>> {
        const session = await this.requireSession(sessionUuid);
        const ranchUuid = session.get('ranch_uuid') as string;
        if (!animalUuid?.trim()) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'animal_uuid is required',
            });
        }

        const animal = await this.repository.findAnimalInRanchByUuid(ranchUuid, animalUuid.trim());
        if (!animal) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }

        const source = await this.repository.findAnimalWorkHistory(
            ranchUuid,
            animal.animal_uuid,
            sessionUuid,
            ANIMAL_WORK_HISTORY_LIMIT
        );

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

    async upsertFinding(sessionUuid: string, body: UpsertCorralFindingBody): Promise<ServiceResponse<null>> {
        await this.requireSession(sessionUuid);
        if (!body.animal_uuid?.trim()) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'animal_uuid is required',
            });
        }

        if (body.observation_text?.trim()) {
            await this.repository.upsertObservation(
                sessionUuid,
                body.animal_uuid,
                body.uuid_corral_session_step,
                body.observation_text.trim()
            );
        }

        if (body.condition_code) {
            if (!CORRAL_VISUAL_CONDITION_CODES.includes(body.condition_code as CorralVisualConditionCode)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Invalid visual condition code',
                });
            }
            await this.repository.upsertVisualCondition(
                sessionUuid,
                body.animal_uuid,
                body.uuid_corral_session_step,
                body.condition_code
            );
        }

        if (body.additional_medications) {
            await this.repository.replaceAdditionalMedications(
                sessionUuid,
                body.animal_uuid,
                body.uuid_corral_session_step,
                body.additional_medications
            );
        }

        if (body.additional_treatments) {
            await this.repository.replaceAdditionalTreatments(
                sessionUuid,
                body.animal_uuid,
                body.uuid_corral_session_step,
                body.additional_treatments
            );
        }

        return { success: true, data: null };
    }

    async applyPaddockDistribution(
        sessionUuid: string,
        stepUuid: string,
        body: ApplyPaddockDistributionBody
    ): Promise<ServiceResponse<ApplyPaddockDistributionResultDto>> {
        const session = await this.requireSession(sessionUuid);
        const plain = session.get({ plain: true }) as CorralWorkSessionAttributes;
        if (plain.status === CorralWorkSessionStatus.CLOSED) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Cannot modify a closed session',
            });
        }

        const moves = body.moves ?? [];
        if (!Array.isArray(moves)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'moves must be a list',
            });
        }
        for (const move of moves) {
            if (!UUID_PATTERN.test(move.animal_uuid ?? '') || !UUID_PATTERN.test(move.destination_paddock_uuid ?? '')) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Each move requires a valid animal and destination paddock',
                });
            }
        }

        const stepsWithActivities = await this.repository.findStepsWithActivities(sessionUuid);
        const stepDef = stepsWithActivities.find((item) => item.step.uuid_corral_session_step === stepUuid);
        if (!stepDef) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Processing step not found',
            });
        }
        if (!stepDef.activities.some((code) => isPaddockMoveActivity(code))) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'This step does not include paddock movement',
            });
        }

        const stepAnimalUuids = await this.repository.findStepAnimalUuids(stepUuid);
        const unknownAnimal = moves.find((move) => !stepAnimalUuids.has(move.animal_uuid));
        if (unknownAnimal) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'One or more animals are not part of this step',
            });
        }

        const sequelize = requireTenantSequelize();
        const applied = await sequelize.transaction(async (transaction) => {
            const result = await this.animalMovementService.applyDistribution(
                {
                    ranchUuid: plain.ranch_uuid,
                    sessionUuid,
                    movementDate: plain.work_date,
                    moves,
                },
                transaction
            );

            const existingParticipations = await this.repository.findActiveParticipationKeys(sessionUuid, stepUuid);
            let additionalParticipations = 0;
            for (const move of result.moved) {
                const key = `${move.animal_uuid}:${CorralActivityCode.PADDOCK_MOVE}`;
                if (!existingParticipations.has(key)) {
                    additionalParticipations += 1;
                    existingParticipations.add(key);
                }
            }
            await this.assertActivityParticipationCapacity(additionalParticipations);

            for (const move of result.moved) {
                await this.repository.upsertActivityRecord(
                    {
                        uuid_corral_work_session: sessionUuid,
                        uuid_corral_session_step: stepUuid,
                        animal_uuid: move.animal_uuid,
                        activity_code: CorralActivityCode.PADDOCK_MOVE,
                        bool_value: null,
                        numeric_value: null,
                        text_value: move.destination_paddock_uuid,
                        medicine_uuid: null,
                        dose: null,
                        unit: null,
                        identification_type: null,
                        weight_record_uuid: null,
                    },
                    transaction
                );
            }

            return result;
        });

        if (applied.moved.length > 0 && plain.status === CorralWorkSessionStatus.DRAFT) {
            await this.repository.updateSession(sessionUuid, {
                status: CorralWorkSessionStatus.IN_PROGRESS,
                started_at: new Date(),
            });
        }

        const workspace = await this.getWorkspace(sessionUuid);
        const grid = workspace.data?.grids.find((item) => item.uuid_corral_session_step === stepUuid);
        if (!grid) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to reload step grid',
            });
        }

        const refreshed = await this.requireSession(sessionUuid);
        return {
            success: true,
            data: {
                moved_count: applied.moved.length,
                capacity_warnings: applied.capacity_warnings,
                session_status: refreshed.get('status') as CorralWorkSessionStatus,
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
    private countNewGridParticipations(
        existing: Set<string>,
        rows: SaveCorralStepGridBody['rows'],
        activities: CorralActivityCode[],
        unregisteredUuids: Set<string>
    ): number {
        const pending = new Set<string>();
        for (const row of rows) {
            const isUnregistered =
                row.missing_inventory === true ||
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

    private gridCellCreatesParticipation(activity: CorralActivityCode, raw: unknown): boolean {
        if (isMultiRecordActivity(activity)) {
            const rawItems = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
            return rawItems.some((item) => String(item ?? '').trim().length > 0);
        }
        if (raw === undefined || raw === null || raw === '') {
            return false;
        }
        return !Array.isArray(raw);
    }

    private async assertActivityParticipationCapacity(additional: number): Promise<void> {
        if (additional <= 0) {
            return;
        }
        const uuidCompany = tenantRequestStorage.getStore()?.uuid_company;
        if (!uuidCompany) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Tenant operational context is not initialized for this request',
            });
        }
        const limit = await this.saasPlanService.getResourceLimit(
            uuidCompany,
            SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS
        );
        const current = await this.repository.countActiveActivityParticipations();
        if (current + additional > limit) {
            throw new ApiError({
                name: 'PlanActivityRecordLimitReached',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Yearly activity limit reached for this company (${limit})`,
            });
        }
    }

    private resolveStepWorkMode(
        activities: CorralActivityCode[],
        requested?: CorralStepWorkMode
    ): CorralStepWorkMode {
        if (requested && CORRAL_STEP_WORK_MODES.includes(requested)) {
            return requested;
        }
        if (activities.length === 1 && isPaddockMoveActivity(activities[0])) {
            return CorralStepWorkMode.PRELOADED_SEARCH;
        }
        return CorralStepWorkMode.SCAN_DYNAMIC;
    }

    private validateCreateBody(body: CreateCorralWorkSessionBody): void {
        if (!body.ranch_uuid?.trim()) {
            throw new ApiError({ name: 'ValidationError', statusCode: HttpStatusCodes.BAD_REQUEST, description: 'ranch_uuid is required' });
        }
        if (!body.work_date?.trim()) {
            throw new ApiError({ name: 'ValidationError', statusCode: HttpStatusCodes.BAD_REQUEST, description: 'work_date is required' });
        }
        const assignments = body.activity_assignments ?? [];
        for (const item of assignments) {
            if (!CORRAL_ACTIVITY_CODES.includes(item.activity_code)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: `Invalid activity: ${item.activity_code}`,
                });
            }
            if (!item.step_order || item.step_order < 1) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'step_order must be >= 1',
                });
            }
        }
    }

    private validateConfigureBody(body: ConfigureCorralWorkBody): void {
        const steps = body.steps ?? [];
        if (steps.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'At least one step is required',
            });
        }

        const stepOrders = new Set<number>();
        for (const step of steps) {
            if (!step.step_order || step.step_order < 1) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'step_order must be >= 1',
                });
            }
            if (stepOrders.has(step.step_order)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Duplicate step_order in configuration',
                });
            }
            stepOrders.add(step.step_order);

            if (!CORRAL_STEP_WORK_MODES.includes(step.work_mode ?? CorralStepWorkMode.SCAN_DYNAMIC)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: `Invalid work mode: ${step.work_mode}`,
                });
            }

            const activityCodes = step.activity_codes ?? [];
            if (activityCodes.length === 0) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Each step must include at least one activity',
                });
            }
            for (const code of activityCodes) {
                if (!CORRAL_ACTIVITY_CODES.includes(code)) {
                    throw new ApiError({
                        name: 'ValidationError',
                        statusCode: HttpStatusCodes.BAD_REQUEST,
                        description: `Invalid activity: ${code}`,
                    });
                }
            }
        }
    }

    private validateAnimalsPreviewBody(
        body: Pick<CorralSessionAnimalsLoadBody, 'source_paddock_uuids' | 'source_filters' | 'manual_animal_uuids'>
    ): void {
        const hasSource =
            (body.source_paddock_uuids?.length ?? 0) > 0 ||
            (body.source_filters?.length ?? 0) > 0 ||
            (body.manual_animal_uuids?.length ?? 0) > 0;
        if (!hasSource) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'At least one animal source is required (paddock, category filter, or manual)',
            });
        }
    }

    private validateAnimalsLoadBody(
        body: CorralSessionAnimalsLoadBody,
        preloadedSteps: Array<{ step: { uuid_corral_session_step: string } }>
    ): void {
        const hasSource =
            (body.source_paddock_uuids?.length ?? 0) > 0 ||
            (body.source_filters?.length ?? 0) > 0 ||
            (body.manual_animal_uuids?.length ?? 0) > 0;
        if (!hasSource) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'At least one animal source is required (paddock, category filter, or manual)',
            });
        }
        if (preloadedSteps.length > 0 && !body.step_assignments?.length) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Step animal assignments are required for preloaded steps',
            });
        }
    }

    private validateStepAssignments(
        loadedAnimalUuids: Set<string>,
        stepsWithActivities: Array<{ step: { uuid_corral_session_step: string; work_mode: CorralStepWorkMode } }>,
        assignments: CorralSessionAnimalsLoadBody['step_assignments']
    ): void {
        const preloadedSteps = stepsWithActivities.filter((item) =>
            CORRAL_PRELOADED_WORK_MODES.includes(item.step.work_mode)
        );
        if (preloadedSteps.length === 0) {
            return;
        }

        const validStepUuids = new Set(preloadedSteps.map((item) => item.step.uuid_corral_session_step));
        const animalsAssignedToPreloadedStep = new Set<string>();

        for (const assignment of assignments ?? []) {
            if (!validStepUuids.has(assignment.uuid_corral_session_step)) {
                continue;
            }
            for (const animalUuid of assignment.animal_uuids ?? []) {
                if (!loadedAnimalUuids.has(animalUuid)) {
                    throw new ApiError({
                        name: 'ValidationError',
                        statusCode: HttpStatusCodes.BAD_REQUEST,
                        description: 'Assigned animal is not part of the loaded set',
                    });
                }
                animalsAssignedToPreloadedStep.add(animalUuid);
            }
        }

        for (const animalUuid of loadedAnimalUuids) {
            if (!animalsAssignedToPreloadedStep.has(animalUuid)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Every loaded animal must be assigned to at least one preloaded step',
                });
            }
        }
    }

    private async persistSourcesFromLoadBody(
        sessionUuid: string,
        body: Pick<CorralSessionAnimalsLoadBody, 'source_paddock_uuids' | 'source_filters' | 'manual_animal_uuids'>
    ): Promise<void> {
        for (const paddockUuid of body.source_paddock_uuids ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: CorralSessionSourceType.PADDOCK,
                paddock_uuid: paddockUuid,
            });
        }
        for (const filter of body.source_filters ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: CorralSessionSourceType.FILTER,
                filter_key: filter.filter_key,
                filter_value: filter.filter_value,
            });
        }
        for (const animalUuid of body.manual_animal_uuids ?? []) {
            await this.repository.createSource({
                uuid_corral_work_session: sessionUuid,
                source_type: CorralSessionSourceType.MANUAL,
                animal_uuid: animalUuid,
            });
        }
    }

    private async persistConfiguredSteps(
        sessionUuid: string,
        steps: ConfigureCorralWorkBody['steps']
    ): Promise<void> {
        const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
        for (const step of sorted) {
            const created = await this.repository.createStep(
                sessionUuid,
                step.step_order,
                step.label ?? null,
                this.resolveStepWorkMode(step.activity_codes, step.work_mode)
            );
            const stepUuid = created.get('uuid_corral_session_step') as string;
            for (const activityCode of step.activity_codes) {
                await this.repository.createStepActivity(stepUuid, activityCode);
            }
        }
    }

    private async persistStepsAndActivities(
        sessionUuid: string,
        assignments: CorralActivityAssignmentInput[]
    ): Promise<void> {
        const stepOrders = [...new Set(assignments.map((a) => a.step_order))].sort((a, b) => a - b);
        const stepUuidByOrder = new Map<number, string>();

        for (const order of stepOrders) {
            const step = await this.repository.createStep(sessionUuid, order);
            stepUuidByOrder.set(order, step.get('uuid_corral_session_step') as string);
        }

        for (const assignment of assignments) {
            const stepUuid = stepUuidByOrder.get(assignment.step_order);
            if (!stepUuid) continue;
            await this.repository.createStepActivity(stepUuid, assignment.activity_code);
        }
    }

    private async toDetail(session: CorralWorkSessionAttributes): Promise<CorralSessionDetailDto> {
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

    private async requireAnimalInSessionRanch(
        ranchUuid: string,
        identifier: string
    ): Promise<{ animal_uuid: string; registration_number: string; chip_number?: string | null }> {
        const animal = await this.repository.findAnimalInRanchByIdentifier(ranchUuid, identifier);
        if (animal) {
            return animal;
        }

        const fallback = await this.repository.findActiveAnimalByIdentifier(identifier);
        if (fallback && fallback.ranch_uuid !== ranchUuid) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found for this ranch',
            });
        }

        throw new ApiError({
            name: 'NotFound',
            statusCode: HttpStatusCodes.NOT_FOUND,
            description: 'Animal not found for this ranch',
        });
    }

    private async requireSession(uuid: string) {
        if (!uuid?.trim()) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Corral work session id is required',
            });
        }
        const session = await this.repository.findSessionById(uuid);
        if (!session) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Corral work session not found',
            });
        }
        return session;
    }

    private buildAnimalWorkHistorySessions(source: AnimalWorkHistorySource): AnimalCorralWorkHistorySessionDto[] {
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

            if (
                activities.length === 0 &&
                observations.length === 0 &&
                condition_codes.length === 0 &&
                medications.length === 0 &&
                treatments.length === 0
            ) {
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

    private summarizeActivityRecords(
        records: CorralActivityRecordAttributes[]
    ): AnimalCorralWorkHistorySessionDto['activities'] {
        const valuesByCode = new Map<string, string[]>();
        for (const record of records) {
            const value = this.formatActivityRecordValue(record);
            if (!value) continue;
            const current = valuesByCode.get(record.activity_code) ?? [];
            current.push(value);
            valuesByCode.set(record.activity_code, current);
        }

        return [...valuesByCode.entries()]
            .sort(([left], [right]) => this.activitySortIndex(left) - this.activitySortIndex(right))
            .map(([activity_code, values]) => ({ activity_code, values }));
    }

    private formatActivityRecordValue(record: CorralActivityRecordAttributes): string | null {
        if (record.activity_code === CorralActivityCode.ATTENDANCE) {
            if (record.bool_value == null) return null;
            return record.bool_value ? 'true' : 'false';
        }
        if (record.activity_code === CorralActivityCode.WEIGHING) {
            if (record.numeric_value == null) return null;
            return this.formatHistoryNumber(record.numeric_value);
        }
        const text = this.joinDisplayParts(record.text_value, record.dose, record.unit);
        return text || null;
    }

    private joinDisplayParts(...parts: Array<string | null | undefined>): string {
        return parts
            .map((part) => (part ?? '').trim())
            .filter((part) => part.length > 0)
            .join(' ');
    }

    private formatHistoryNumber(value: number | string): string {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return String(value);
        return numeric.toFixed(2).replace(/\.?0+$/, '');
    }

    private activitySortIndex(code: string): number {
        const index = CORRAL_ACTIVITY_CODES.indexOf(code as CorralActivityCode);
        return index === -1 ? CORRAL_ACTIVITY_CODES.length : index;
    }

    private toDateOnly(value: Date | string): string {
        if (typeof value === 'string') return value.slice(0, 10);
        return value.toISOString().slice(0, 10);
    }

    private groupBySession<T extends { uuid_corral_work_session: string }>(rows: T[]): Map<string, T[]> {
        const grouped = new Map<string, T[]>();
        for (const row of rows) {
            const current = grouped.get(row.uuid_corral_work_session) ?? [];
            current.push(row);
            grouped.set(row.uuid_corral_work_session, current);
        }
        return grouped;
    }

    private buildColumns(codes: CorralActivityCode[]): CorralStepGridColumnDto[] {
        const columns: CorralStepGridColumnDto[] = [];
        for (const code of codes) {
            if (isPaddockMoveActivity(code)) {
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

    private buildColumn(code: CorralActivityCode): CorralStepGridColumnDto {
        return {
            activity_code: code,
            column_key: code.toLowerCase(),
            label: CORRAL_ACTIVITY_COLUMN_LABELS[code],
            value_type: CORRAL_ACTIVITY_VALUE_TYPES[code],
        };
    }

    private recordToCellValue(rec: {
        activity_code: string;
        bool_value?: boolean | null;
        numeric_value?: number | null;
        text_value?: string | null;
        medicine_uuid?: string | null;
    }): string | number | boolean | null {
        switch (rec.activity_code) {
            case CorralActivityCode.ATTENDANCE:
                return rec.bool_value ?? null;
            case CorralActivityCode.WEIGHING:
                return rec.numeric_value != null ? Number(rec.numeric_value) : null;
            default:
                return rec.text_value ?? rec.medicine_uuid ?? null;
        }
    }

    private buildActivityPayload(
        sessionUuid: string,
        stepUuid: string,
        animalUuid: string,
        activity: CorralActivityCode,
        raw: string | number | boolean
    ) {
        const base = {
            uuid_corral_work_session: sessionUuid,
            uuid_corral_session_step: stepUuid,
            animal_uuid: animalUuid,
            activity_code: activity,
            bool_value: null as boolean | null,
            numeric_value: null as number | null,
            text_value: null as string | null,
            medicine_uuid: null as string | null,
            dose: null as string | null,
            unit: null as string | null,
            identification_type: null as string | null,
            weight_record_uuid: null as string | null,
        };

        switch (activity) {
            case CorralActivityCode.ATTENDANCE:
                base.bool_value = raw === true || raw === 'true' || raw === 1 || raw === '1';
                break;
            case CorralActivityCode.WEIGHING:
                base.numeric_value = typeof raw === 'number' ? raw : Number(raw);
                break;
            case CorralActivityCode.IDENTIFICATION:
                base.text_value = String(raw);
                base.identification_type = 'ear_tag';
                break;
            case CorralActivityCode.VACCINATION:
            case CorralActivityCode.DEWORMING:
                base.text_value = String(raw);
                break;
            default:
                base.text_value = String(raw);
        }
        return base;
    }
}

export default CorralWorkSessionService;
