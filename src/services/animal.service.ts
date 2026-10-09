import { ServiceResponse } from "../interfaces/common/service-response.interface";
import { AnimalAttributes, AnimalCreationAttributes, AnimalSex } from "../interfaces/animal/animal.interface";
import { AnimalWriteRequestBody } from "../interfaces/animal/animal-registration.interface";
import {
    AnimalBatchCreateResult,
    AnimalBatchRowInput,
    AnimalBatchRowResult,
} from "../interfaces/animal/animal-batch.interface";
import { IBaseServiceInterface } from "../interfaces/services/base-service.interface";
import ApiError from "../errors/apiError";
import HttpStatusCodes from "../errors/httpStatusCodes";
import { IBaseParams } from "../interfaces/params/query.interface";
import AnimalRepository from "../repositories/animal.repository";
import AnimalDisposalRepository from "../repositories/animal-disposal.repository";
import {
    ANIMAL_EXIT_TYPES,
    AnimalExitType,
    exitTypeToCurrentStatus,
    isAnimalExitType,
} from "../constants/animal-exit.constants";
import {
    AnimalDeactivateBatchRequestBody,
    AnimalDeactivateBatchResult,
    AnimalDeactivateBatchRowResult,
    AnimalDeactivateRequestBody,
    AnimalDeactivateResult,
    AnimalListItemWithExit,
} from "../interfaces/animal/animal-exit.interface";
import { AnimalDisposalAttributes } from "../interfaces/animal/animal-operations.interface";
import { CompanyAttributes, CompanyCreationAttributes } from "../interfaces/company/company.interface";
import { SAAS_PLAN_RESOURCE } from "../constants/saas-plan.constants";
import { resolveCompanyPlanCode } from "../constants/subscription.constants";
import SaasPlanService from "./saas-plan.service";
import { isValidCattleBreedCode } from "../constants/cattle-breed.constants";
import PaddockRepository from "../repositories/paddock.repository";
import OwnerRepository from "../repositories/owner.repository";
import { RanchAttributes, RanchCreationAttributes } from "../interfaces/ranch/ranch.interface";
import { requireTenantModels } from "../database/tenant/tenant-request-context";
import type { Model } from "sequelize";

export type AnimalCreateContext = {
    jwtCompanyUuid?: string;
    isSaasOwner: boolean;
};

/** Max rows per batch request (aligned with UI grid cap). */
const ANIMAL_BATCH_MAX_ROWS = 500;
const ANIMAL_DEACTIVATE_BATCH_MAX = 500;

type RanchRow = Model<RanchAttributes, RanchCreationAttributes>;

type HeadBudget = {
    baseCount: number;
    createdInBatch: number;
    limit: number;
    planLabel: string;
};

type BatchDuplicateKeys = {
    seenRegistration: Set<string>;
    seenChip: Set<string>;
};

class AnimalService implements IBaseServiceInterface<AnimalAttributes, AnimalCreationAttributes> {

    private readonly animalRepository: AnimalRepository;
    private readonly animalDisposalRepository: AnimalDisposalRepository;
    private readonly companyService: IBaseServiceInterface<CompanyAttributes, CompanyCreationAttributes>;
    private readonly saasPlanService: SaasPlanService;
    private readonly paddockRepository: PaddockRepository;
    private readonly ownerRepository: OwnerRepository;

    constructor(
        animalRepository: AnimalRepository,
        companyService: IBaseServiceInterface<CompanyAttributes, CompanyCreationAttributes>,
        saasPlanService: SaasPlanService,
        paddockRepository?: PaddockRepository,
        ownerRepository?: OwnerRepository,
        animalDisposalRepository?: AnimalDisposalRepository,
    ) {
        this.animalRepository = animalRepository;
        this.animalDisposalRepository = animalDisposalRepository ?? new AnimalDisposalRepository();
        this.companyService = companyService;
        this.saasPlanService = saasPlanService;
        this.paddockRepository = paddockRepository ?? new PaddockRepository();
        this.ownerRepository = ownerRepository ?? new OwnerRepository();
    }

    private async validateRanchBelongsToCompany(
        uuidRanch: string | null | undefined,
        tenantContext?: { uuid_company?: string }
    ): Promise<void> {
        if (!uuidRanch) {
            return;
        }

        const { RanchModel } = requireTenantModels();
        const ranch = await RanchModel.findOne({
            where: { uuid_ranch: uuidRanch, is_active: true }
        }) as RanchRow | null;
        if (!ranch) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Ranch not found'
            });
        }

        const ranchPlain = ranch.get({ plain: true }) as RanchAttributes;

        const tenantCompany = tenantContext?.uuid_company;
        if (tenantCompany && ranchPlain.uuid_company !== tenantCompany) {
            throw new ApiError({
                name: 'Forbidden',
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: 'Animal ranch does not belong to authenticated company'
            });
        }
    }

    private async resolveTenantCompanyForRanch(
        ranchUuid: string,
        ctx: AnimalCreateContext
    ): Promise<string> {
        const { RanchModel } = requireTenantModels();
        const ranch = await RanchModel.findOne({
            where: { uuid_ranch: ranchUuid, is_active: true }
        }) as RanchRow | null;
        if (!ranch) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Ranch not found'
            });
        }
        if (!ctx.isSaasOwner) {
            const ranchPlain = ranch.get({ plain: true }) as RanchAttributes;
            if (ranchPlain.uuid_company !== ctx.jwtCompanyUuid) {
                throw new ApiError({
                    name: 'Forbidden',
                    statusCode: HttpStatusCodes.FORBIDDEN,
                    description: 'Ranch does not belong to authenticated company'
                });
            }
        }
        return (ranch.get({ plain: true }) as RanchAttributes).uuid_company as string;
    }

    private async resolveParentUuidByRegistration(
        ranchUuid: string,
        registrationRaw: string,
        expectedSex: AnimalSex
    ): Promise<string | null> {
        const registration_number = registrationRaw.trim();
        if (!registration_number) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Parent registration number is empty (${expectedSex})`
            });
        }
        return this.animalRepository.findActiveUuidByRanchRegistrationAndSex(
            ranchUuid,
            registration_number,
            expectedSex
        );
    }

    /**
     * Accepts `YYYY` (stored as Jan 1 UTC) or `YYYY-MM-DD` (UTC calendar date).
     * Rejects null/empty and out-of-range years.
     */
    private assertNormalizedBirthDate(raw: unknown): Date {
        if (raw === null || raw === undefined) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'birth_date is required',
            });
        }
        if (raw instanceof Date) {
            if (Number.isNaN(raw.getTime())) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Invalid birth_date',
                });
            }
            return this.assertBirthYearInRangeUtc(
                Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate())
            );
        }
        const s0 = String(raw).trim();
        if (!s0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'birth_date is required',
            });
        }
        const s = /^\d{4}-\d{2}-\d{2}T/.test(s0) ? s0.slice(0, 10) : s0;
        let y: number;
        let mo = 1;
        let da = 1;
        const yearOnly = /^(\d{4})$/;
        const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;
        let m = yearOnly.exec(s);
        if (m) {
            y = Number(m[1]);
        } else {
            m = isoDate.exec(s);
            if (!m) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'birth_date must be a four-digit year (YYYY) or calendar date (YYYY-MM-DD)',
                });
            }
            y = Number(m[1]);
            mo = Number(m[2]);
            da = Number(m[3]);
        }
        const utcMs = Date.UTC(y, mo - 1, da);
        const utc = new Date(utcMs);
        if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== da) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Invalid birth_date',
            });
        }
        return this.assertBirthYearInRangeUtc(utcMs);
    }

    private assertBirthYearInRangeUtc(utcMs: number): Date {
        const y = new Date(utcMs).getUTCFullYear();
        const maxY = new Date().getUTCFullYear() + 1;
        if (y < 1900 || y > maxY) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `birth_date year must be between 1900 and ${maxY}`,
            });
        }
        return new Date(utcMs);
    }

    private normalizeOptionalChip(raw: unknown): string | null {
        if (raw === null || raw === undefined) {
            return null;
        }
        const trimmed = String(raw).trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private async assertChipUniqueInRanch(
        ranchUuid: string,
        chip_number: string,
        options?: { excludeAnimalUuid?: string }
    ): Promise<void> {
        const conflict = await this.animalRepository.findAnimalUuidByRanchAndChip(
            ranchUuid,
            chip_number,
            options
        );
        if (conflict) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'chip_number must be unique within the ranch'
            });
        }
    }

    async getAll(params: IBaseParams): Promise<ServiceResponse<AnimalListItemWithExit[]>> {
        const exitType = params.exit_type?.trim().toUpperCase();
        const currentStatus = params.status === 'inactive' && exitType && isAnimalExitType(exitType)
            ? exitTypeToCurrentStatus(exitType)
            : undefined;
        const { rows, count } = await this.animalRepository.findAll({
            ...params,
            current_status: currentStatus,
        });
        const plainAnimals = rows.map((animal: Model<AnimalAttributes, AnimalCreationAttributes>) =>
            animal.get({ plain: true })
        ) as AnimalListItemWithExit[];

        let data: AnimalListItemWithExit[] = plainAnimals;
        if (params.status === 'inactive' && plainAnimals.length > 0) {
            const disposalMap = await this.animalDisposalRepository.findLatestByAnimalUuids(
                plainAnimals.map((a) => a.animal_uuid)
            );
            data = plainAnimals.map((animal) => ({
                ...animal,
                last_exit: this.mapDisposalToLastExit(disposalMap.get(animal.animal_uuid)),
            }));
        }

        return {
            success: true,
            data,
            pagination: {
                totalItems: count,
                totalPages: params.size > 0 ? Math.ceil(count / params.size) : 1,
                currentPage: params.size > 0 ? params.page : 1,
                order: params.order,
                pageSize: params.size > 0 ? params.size : count
            }
        };
    }

    async create(
        animalBody: AnimalCreationAttributes,
        createContext?: AnimalCreateContext
    ): Promise<ServiceResponse<AnimalAttributes>> {
        const body = animalBody as AnimalWriteRequestBody;
        const ctx: AnimalCreateContext = createContext ?? { isSaasOwner: false };
        const headBudgets = new Map<string, HeadBudget>();
        const data = await this.persistNewAnimal(body, ctx, headBudgets);
        return { success: true, data };
    }

    /**
     * Creates many animals in one request. Each row is processed independently:
     * successes are persisted; failures return per-row errors (partial save).
     */
    async createBatch(
        rows: AnimalBatchRowInput[],
        createContext?: AnimalCreateContext
    ): Promise<ServiceResponse<AnimalBatchCreateResult>> {
        if (!Array.isArray(rows) || rows.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'rows array is required and must not be empty',
            });
        }
        if (rows.length > ANIMAL_BATCH_MAX_ROWS) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Batch cannot exceed ${ANIMAL_BATCH_MAX_ROWS} rows`,
            });
        }

        const ctx: AnimalCreateContext = createContext ?? { isSaasOwner: false };
        const headBudgets = new Map<string, HeadBudget>();
        const batchKeys: BatchDuplicateKeys = {
            seenRegistration: new Set<string>(),
            seenChip: new Set<string>(),
        };

        const results: AnimalBatchRowResult[] = [];

        for (const item of rows) {
            const index = Number(item?.index);
            if (!Number.isInteger(index) || index < 0) {
                results.push({
                    index: Number.isFinite(index) ? index : -1,
                    success: false,
                    error: 'index must be a non-negative integer',
                });
                continue;
            }

            const animalBody = item?.animal as AnimalWriteRequestBody | undefined;
            if (!animalBody || typeof animalBody !== 'object') {
                results.push({ index, success: false, error: 'animal payload is required' });
                continue;
            }

            try {
                const created = await this.persistNewAnimal(animalBody, ctx, headBudgets, batchKeys);
                results.push({
                    index,
                    success: true,
                    animal_uuid: created.animal_uuid,
                });
            } catch (error) {
                results.push({
                    index,
                    success: false,
                    error: this.errorMessageFromUnknown(error),
                });
            }
        }

        const created = results.filter((r) => r.success).length;
        const failed = results.length - created;

        return {
            success: true,
            data: {
                created,
                failed,
                results,
            },
        };
    }

    private registrationKey(ranchUuid: string, registrationNumber: string): string {
        return `${ranchUuid}\u0000${registrationNumber.trim().toLowerCase()}`;
    }

    private chipKey(ranchUuid: string, chipNumber: string): string {
        return `${ranchUuid}\u0000${chipNumber.trim().toLowerCase()}`;
    }

    private assertNoBatchDuplicate(
        ranchUuid: string,
        registration_number: string,
        chip_number: string | null,
        batchKeys: BatchDuplicateKeys
    ): void {
        const regKey = this.registrationKey(ranchUuid, registration_number);
        if (batchKeys.seenRegistration.has(regKey)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'registration_number is duplicated within this batch for the same ranch',
            });
        }
        if (chip_number) {
            const cKey = this.chipKey(ranchUuid, chip_number);
            if (batchKeys.seenChip.has(cKey)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'chip_number is duplicated within this batch for the same ranch',
                });
            }
        }
    }

    private rememberBatchKeys(
        ranchUuid: string,
        registration_number: string,
        chip_number: string | null,
        batchKeys: BatchDuplicateKeys
    ): void {
        batchKeys.seenRegistration.add(this.registrationKey(ranchUuid, registration_number));
        if (chip_number) {
            batchKeys.seenChip.add(this.chipKey(ranchUuid, chip_number));
        }
    }

    private async resolveHeadBudget(
        tenantCompany: string,
        headBudgets: Map<string, HeadBudget>
    ): Promise<HeadBudget> {
        let budget = headBudgets.get(tenantCompany);
        if (budget) {
            return budget;
        }

        const companyResponse = await this.companyService.getById({ id: tenantCompany, includeInactive: true });
        if (!companyResponse.success || !companyResponse.data) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company not found',
            });
        }

        const plan = resolveCompanyPlanCode(companyResponse.data.plan_type);
        const limit = await this.saasPlanService.getResourceLimit(tenantCompany, SAAS_PLAN_RESOURCE.ANIMALS);
        const baseCount = await this.animalRepository.countActiveByCompany(tenantCompany);
        budget = { baseCount, createdInBatch: 0, limit, planLabel: plan };
        headBudgets.set(tenantCompany, budget);
        return budget;
    }

    private assertHeadBudgetAvailable(budget: HeadBudget): void {
        if (budget.baseCount + budget.createdInBatch >= budget.limit) {
            throw new ApiError({
                name: 'PlanAnimalHeadLimitReached',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Animal head limit reached for this company (${budget.limit} heads for plan ${budget.planLabel})`,
            });
        }
    }

    private errorMessageFromUnknown(error: unknown): string {
        if (error instanceof ApiError) {
            return error.description || error.message || 'Request failed';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'Request failed';
    }

    private async persistNewAnimal(
        body: AnimalWriteRequestBody,
        ctx: AnimalCreateContext,
        headBudgets: Map<string, HeadBudget>,
        batchKeys?: BatchDuplicateKeys
    ): Promise<AnimalAttributes> {
        const ranchUuid = body.ranch_uuid?.trim();
        if (!ranchUuid) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'ranch_uuid is required',
            });
        }

        const tenantCompany = await this.resolveTenantCompanyForRanch(ranchUuid, ctx);

        const registration_number = body.registration_number?.trim();
        if (!registration_number) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'registration_number is required',
            });
        }

        const chip_number = this.normalizeOptionalChip(body.chip_number);

        if (batchKeys) {
            this.assertNoBatchDuplicate(ranchUuid, registration_number, chip_number, batchKeys);
        }

        const duplicate = await this.animalRepository.findAnimalUuidByRanchAndRegistration(
            ranchUuid,
            registration_number
        );
        if (duplicate) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'registration_number must be unique within the ranch',
            });
        }

        const breedRaw = body.breed_code == null ? '' : String(body.breed_code).trim();
        const breed_code = breedRaw === '' ? null : breedRaw;
        if (breed_code !== null && !isValidCattleBreedCode(breed_code)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Invalid breed_code',
            });
        }

        let mother_animal_uuid = body.mother_animal_uuid ?? null;
        let father_animal_uuid = body.father_animal_uuid ?? null;

        if (body.mother_registration_number?.trim()) {
            mother_animal_uuid = await this.resolveParentUuidByRegistration(
                ranchUuid,
                body.mother_registration_number,
                'FEMALE'
            );
        }
        if (body.father_registration_number?.trim()) {
            father_animal_uuid = await this.resolveParentUuidByRegistration(
                ranchUuid,
                body.father_registration_number,
                'MALE'
            );
        }

        if (body.current_owner_uuid) {
            const ok = await this.ownerRepository.existsActive(body.current_owner_uuid);
            if (!ok) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Owner not found or inactive',
                });
            }
        }

        if (body.current_paddock_uuid) {
            const ok = await this.paddockRepository.existsActiveInRanch(body.current_paddock_uuid, ranchUuid);
            if (!ok) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Paddock not found or does not belong to this ranch',
                });
            }
        }

        await this.validateRanchBelongsToCompany(ranchUuid, { uuid_company: tenantCompany });

        const budget = await this.resolveHeadBudget(tenantCompany, headBudgets);
        this.assertHeadBudgetAvailable(budget);

        const birth_date = this.assertNormalizedBirthDate(body.birth_date);

        if (chip_number) {
            await this.assertChipUniqueInRanch(ranchUuid, chip_number);
        }

        const payload: AnimalCreationAttributes = {
            ranch_uuid: ranchUuid,
            breed_code,
            registration_number,
            chip_number,
            mother_animal_uuid,
            father_animal_uuid,
            current_owner_uuid: body.current_owner_uuid ?? null,
            sex: body.sex ?? 'MALE',
            color: body.color ?? null,
            birth_date,
            origin_type: body.origin_type ?? 'UNKNOWN',
            description: body.description ?? null,
            current_paddock_uuid: body.current_paddock_uuid ?? null,
            current_status: 'ACTIVE',
            is_active: true,
        };

        const animal = await this.animalRepository.create(payload);
        budget.createdInBatch += 1;

        if (batchKeys) {
            this.rememberBatchKeys(ranchUuid, registration_number, chip_number, batchKeys);
        }

        return animal.get({ plain: true }) as AnimalAttributes;
    }

    async getById(params: {
        id: string;
        includeInactive?: boolean;
        uuid_company?: string;
        uuid_ranch_in?: string[];
    }): Promise<ServiceResponse<AnimalAttributes>> {
        const { id, includeInactive, uuid_company, uuid_ranch_in } = params;
        if (!id || id.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Animal ID is required'
            });
        }

        const animal = await this.animalRepository.findById({ id, includeInactive, uuid_company, uuid_ranch_in });
        if (!animal) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found'
            });
        }

        const plain = animal.get({ plain: true }) as AnimalListItemWithExit;
        if (includeInactive) {
            const disposalMap = await this.animalDisposalRepository.findLatestByAnimalUuids([plain.animal_uuid]);
            plain.last_exit = this.mapDisposalToLastExit(disposalMap.get(plain.animal_uuid));
        }

        return { success: true, data: plain };
    }

    async deactivateWithExit(
        animalUuid: string,
        body: AnimalDeactivateRequestBody,
        tenantContext?: { uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<ServiceResponse<AnimalDeactivateResult>> {
        const validated = this.validateDeactivateBody(body);
        const current = await this.animalRepository.findById({
            id: animalUuid,
            includeInactive: false,
            uuid_company: tenantContext?.uuid_company,
            uuid_ranch_in: tenantContext?.uuid_ranch_in,
        });
        if (!current) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found or already inactive',
            });
        }

        const plain = current.get({ plain: true }) as AnimalAttributes;
        const currentStatus = exitTypeToCurrentStatus(validated.exit_type);

        const disposalRow = await this.animalDisposalRepository.create({
            animal_uuid: animalUuid,
            disposal_date: validated.exit_date,
            disposal_type: validated.exit_type,
            reason: validated.reason,
            description: validated.description,
            is_active: true,
        });

        const marked = await this.animalRepository.markInactiveWithStatus(
            animalUuid,
            currentStatus,
            tenantContext
        );
        if (!marked) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found or already inactive',
            });
        }

        const updated = await this.animalRepository.findById({
            id: animalUuid,
            includeInactive: true,
            uuid_company: tenantContext?.uuid_company,
            uuid_ranch_in: tenantContext?.uuid_ranch_in,
        });

        return {
            success: true,
            data: {
                animal: (updated?.get({ plain: true }) ?? {
                    ...plain,
                    is_active: false,
                    current_status: currentStatus,
                }) as AnimalAttributes,
                disposal: disposalRow.get({ plain: true }) as AnimalDisposalAttributes,
            },
        };
    }

    async deactivateBatchWithExit(
        body: AnimalDeactivateBatchRequestBody,
        tenantContext?: { uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<ServiceResponse<AnimalDeactivateBatchResult>> {
        const inputRows = Array.isArray(body?.rows) ? body.rows : [];
        if (inputRows.length === 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'rows array is required and must not be empty',
            });
        }
        if (inputRows.length > ANIMAL_DEACTIVATE_BATCH_MAX) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Batch cannot exceed ${ANIMAL_DEACTIVATE_BATCH_MAX} animals`,
            });
        }

        const seenUuids = new Set<string>();
        const rows: AnimalDeactivateBatchRowResult[] = [];
        let success = 0;
        let failed = 0;

        for (const row of inputRows) {
            const animalUuid = String(row?.animal_uuid ?? '').trim();
            if (!animalUuid) {
                failed += 1;
                rows.push({ animal_uuid: '', success: false, error: 'animal_uuid is required' });
                continue;
            }
            if (seenUuids.has(animalUuid)) {
                failed += 1;
                rows.push({ animal_uuid: animalUuid, success: false, error: 'Duplicate animal_uuid in batch' });
                continue;
            }
            seenUuids.add(animalUuid);

            try {
                const validated = this.validateDeactivateBody(row);
                await this.deactivateWithExit(
                    animalUuid,
                    {
                        exit_type: validated.exit_type,
                        exit_date: validated.exit_date.toISOString().slice(0, 10),
                        reason: validated.reason,
                        description: validated.description,
                    },
                    tenantContext
                );
                rows.push({ animal_uuid: animalUuid, success: true });
                success += 1;
            } catch (err) {
                failed += 1;
                const message = err instanceof ApiError ? err.description : 'Deactivate failed';
                rows.push({ animal_uuid: animalUuid, success: false, error: message });
            }
        }

        return {
            success: true,
            data: {
                requested: inputRows.length,
                success,
                failed,
                rows,
            },
        };
    }

    private validateDeactivateBody(body: AnimalDeactivateRequestBody): {
        exit_type: AnimalExitType;
        exit_date: Date;
        reason: string | null;
        description: string | null;
    } {
        const exitRaw = typeof body?.exit_type === 'string' ? body.exit_type.trim().toUpperCase() : '';
        if (!isAnimalExitType(exitRaw)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `exit_type must be one of: ${ANIMAL_EXIT_TYPES.join(', ')}`,
            });
        }

        const exit_date = this.parseExitDate(body?.exit_date);
        const reason = typeof body?.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;
        const description =
            typeof body?.description === 'string' && body.description.trim() ? body.description.trim() : null;

        return { exit_type: exitRaw, exit_date, reason, description };
    }

    private parseExitDate(raw: unknown): Date {
        if (raw === null || raw === undefined) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'exit_date is required',
            });
        }
        if (raw instanceof Date) {
            if (Number.isNaN(raw.getTime())) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Invalid exit_date',
                });
            }
            return raw;
        }
        const s0 = String(raw).trim();
        if (!s0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'exit_date is required',
            });
        }
        const s = /^\d{4}-\d{2}-\d{2}T/.test(s0) ? s0.slice(0, 10) : s0;
        const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/;
        const m = isoDate.exec(s);
        if (!m) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'exit_date must be YYYY-MM-DD',
            });
        }
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const da = Number(m[3]);
        const utc = new Date(Date.UTC(y, mo - 1, da));
        if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== da) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Invalid exit_date',
            });
        }
        return utc;
    }

    private mapDisposalToLastExit(disposal?: AnimalDisposalAttributes): AnimalListItemWithExit['last_exit'] {
        if (!disposal) {
            return null;
        }
        return {
            disposal_uuid: disposal.animal_disposal_uuid,
            exit_type: disposal.disposal_type,
            exit_date: disposal.disposal_date,
            reason: disposal.reason ?? null,
            description: disposal.description ?? null,
        };
    }

    async update(
        id: string,
        animalBody: AnimalCreationAttributes,
        tenantContext?: { uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<ServiceResponse<AnimalAttributes>> {
        if (!id || id.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Animal ID is required'
            });
        }

        const body = animalBody as AnimalWriteRequestBody;

        const current = await this.animalRepository.findById({
            id,
            includeInactive: false,
            uuid_company: tenantContext?.uuid_company,
            uuid_ranch_in: tenantContext?.uuid_ranch_in,
        });
        if (!current) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found'
            });
        }

        const currentAttrs = current.get({ plain: true }) as AnimalAttributes;

        const ranchUuid = currentAttrs.ranch_uuid;

        const effectiveTenant = {
            uuid_company: tenantContext?.uuid_company,
            uuid_ranch_in: tenantContext?.uuid_ranch_in,
        };

        await this.validateRanchBelongsToCompany(currentAttrs.ranch_uuid, effectiveTenant);
        const nextRanch = body.ranch_uuid ?? currentAttrs.ranch_uuid;
        await this.validateRanchBelongsToCompany(nextRanch, effectiveTenant);

        if (body.breed_code !== undefined) {
            const bc = body.breed_code == null ? '' : String(body.breed_code).trim();
            if (bc !== '' && !isValidCattleBreedCode(bc)) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Invalid breed_code'
                });
            }
        }

        if (body.registration_number?.trim()) {
            const reg = body.registration_number.trim();
            const conflict = await this.animalRepository.findAnimalUuidByRanchAndRegistration(
                nextRanch,
                reg,
                { excludeAnimalUuid: id }
            );
            if (conflict) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'registration_number must be unique within the ranch'
                });
            }
        }

        let chip_number = currentAttrs.chip_number ?? null;
        if (body.chip_number !== undefined) {
            chip_number = this.normalizeOptionalChip(body.chip_number);
        }
        if (chip_number) {
            await this.assertChipUniqueInRanch(nextRanch, chip_number, { excludeAnimalUuid: id });
        }

        let mother_animal_uuid = body.mother_animal_uuid !== undefined ? body.mother_animal_uuid : currentAttrs.mother_animal_uuid;
        let father_animal_uuid = body.father_animal_uuid !== undefined ? body.father_animal_uuid : currentAttrs.father_animal_uuid;

        if (body.mother_registration_number?.trim()) {
            mother_animal_uuid = await this.resolveParentUuidByRegistration(
                nextRanch,
                body.mother_registration_number,
                'FEMALE'
            );
        }
        if (body.father_registration_number?.trim()) {
            father_animal_uuid = await this.resolveParentUuidByRegistration(
                nextRanch,
                body.father_registration_number,
                'MALE'
            );
        }

        if (body.current_owner_uuid) {
            const ok = await this.ownerRepository.existsActive(body.current_owner_uuid);
            if (!ok) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Owner not found or inactive'
                });
            }
        }

        const paddockRanch = nextRanch;
        if (body.current_paddock_uuid) {
            const ok = await this.paddockRepository.existsActiveInRanch(body.current_paddock_uuid, paddockRanch);
            if (!ok) {
                throw new ApiError({
                    name: 'ValidationError',
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: 'Paddock not found or does not belong to this ranch'
                });
            }
        }

        const plain = current.get({ plain: true }) as AnimalAttributes;
        const rawBirth = body.birth_date !== undefined && body.birth_date !== null ? body.birth_date : plain.birth_date;
        const birth_date = this.assertNormalizedBirthDate(rawBirth);

        const merged: AnimalCreationAttributes = {
            ranch_uuid: body.ranch_uuid ?? plain.ranch_uuid,
            breed_code: body.breed_code !== undefined
                ? (body.breed_code == null || String(body.breed_code).trim() === ''
                    ? null
                    : String(body.breed_code).trim())
                : plain.breed_code,
            registration_number: body.registration_number ?? plain.registration_number,
            chip_number,
            mother_animal_uuid,
            father_animal_uuid,
            current_owner_uuid: body.current_owner_uuid !== undefined ? body.current_owner_uuid : plain.current_owner_uuid ?? null,
            sex: body.sex ?? plain.sex,
            color: body.color !== undefined ? body.color : plain.color,
            birth_date,
            origin_type: body.origin_type ?? plain.origin_type,
            current_status: body.current_status ?? plain.current_status,
            description: body.description !== undefined ? body.description : plain.description,
            current_paddock_uuid: body.current_paddock_uuid !== undefined
                ? body.current_paddock_uuid
                : plain.current_paddock_uuid ?? null,
            is_active: body.is_active ?? plain.is_active,
        };
        const updated = await this.animalRepository.update(id, merged);
        if (!updated) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found'
            });
        }

        return { success: true, data: updated.get({ plain: true }) };
    }

    async delete(id: string, tenantContext?: { uuid_company?: string; uuid_ranch_in?: string[] }): Promise<ServiceResponse<null>> {
        if (!id || id.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Animal ID is required'
            });
        }

        const deleted = await this.animalRepository.delete(id, tenantContext);
        if (!deleted) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Animal not found'
            });
        }

        return { success: true, data: null };
    }

    async listParentCandidates(
        ranch_uuid: string,
        sex: AnimalSex,
        tenantContext?: { uuid_company?: string; uuid_ranch_in?: string[] }
    ): Promise<ServiceResponse<{ animal_uuid: string; registration_number: string }[]>> {
        await this.validateRanchBelongsToCompany(ranch_uuid, { uuid_company: tenantContext?.uuid_company });
        if (tenantContext?.uuid_ranch_in?.length && !tenantContext.uuid_ranch_in.includes(ranch_uuid)) {
            throw new ApiError({
                name: 'Forbidden',
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: 'Ranch not allowed for this user'
            });
        }
        const rows = await this.animalRepository.listByRanchForParentSelection(ranch_uuid, sex);
        return { success: true, data: rows };
    }
}

export default AnimalService;
