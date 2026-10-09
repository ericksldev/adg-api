import { Request, Response, NextFunction } from "express";
import { AnimalAttributes, AnimalCreationAttributes } from "../interfaces/animal/animal.interface";
import { AnimalWriteRequestBody } from "../interfaces/animal/animal-registration.interface";
import { AnimalBatchCreateRequestBody } from "../interfaces/animal/animal-batch.interface";
import { handleResponse } from "../utils/response.handler";
import { buildGetAllParams, buildGetByIdParams } from "../utils/query.builder";
import { IncludeInactiveQuery } from "../interfaces/params/query.interface";
import {
    IDeactivateAnimalParams,
    IDeleteAnimalParams,
    IGetAnimalParams,
    IUpdateAnimalParams,
} from "../interfaces/params/animalParams.interface";
import {
    AnimalDeactivateBatchRequestBody,
    AnimalDeactivateRequestBody,
} from "../interfaces/animal/animal-exit.interface";
import { AuthRequest } from "../interfaces/middleware/auth-middleware.interface";
import { UserRole } from "../interfaces/roles/roles.interface";
import { assertRanchTokenAccess, ranchFilterFromUser } from "../helpers/access-scope.helper";
import ApiError from "../errors/apiError";
import HttpStatusCodes from "../errors/httpStatusCodes";
import AnimalService, { AnimalCreateContext } from "../services/animal.service";
import { CATTLE_BREED_OPTIONS, isValidCattleBreedCode } from "../constants/cattle-breed.constants";
import { isAnimalExitType } from "../constants/animal-exit.constants";
import { AnimalOriginType, AnimalSex } from "../interfaces/animal/animal.interface";

class AnimalController {
    constructor(private readonly animalService: AnimalService) {}

    private isOriginType(value: string): value is AnimalOriginType {
        return value === "BIRTH" || value === "PURCHASE" || value === "TRANSFER" || value === "UNKNOWN";
    }

    private optionalUuid(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
            return undefined;
        }
        return trimmed;
    }

    private optionalIsoDate(value: unknown): string | undefined {
        if (typeof value !== "string") {
            return undefined;
        }
        const trimmed = value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return undefined;
        }
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
            return undefined;
        }
        return trimmed;
    }

    private isSaasOwner(req: AuthRequest): boolean {
        return (req.user?.roles ?? []).includes(UserRole.SAAS_OWNER);
    }

    private animalTenant(req: AuthRequest): { uuid_company?: string; uuid_ranch_in?: string[] } {
        const ranchFilter = ranchFilterFromUser(req.user);
        return {
            uuid_company: this.isSaasOwner(req) ? undefined : req.user?.uuid_company,
            uuid_ranch_in: ranchFilter?.length ? ranchFilter : undefined,
        };
    }

    listBreeds = async (_req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            return handleResponse(res, { success: true, data: CATTLE_BREED_OPTIONS });
        } catch (error) {
            next(error);
        }
    };

    listParentCandidates = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const ranch_uuid = typeof req.query.ranch_uuid === "string" ? req.query.ranch_uuid : "";
            const sexRaw = typeof req.query.sex === "string" ? req.query.sex.toUpperCase() : "";
            if (!ranch_uuid.trim()) {
                throw new ApiError({
                    name: "ValidationError",
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: "ranch_uuid query parameter is required",
                });
            }
            if (sexRaw !== "MALE" && sexRaw !== "FEMALE") {
                throw new ApiError({
                    name: "ValidationError",
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: "sex query parameter must be MALE or FEMALE",
                });
            }
            assertRanchTokenAccess(req.user, ranch_uuid);
            const tenant = this.animalTenant(req);
            const response = await this.animalService.listParentCandidates(
                ranch_uuid,
                sexRaw as AnimalSex,
                tenant
            );
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    createBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = req.body as AnimalBatchCreateRequestBody;
            const rows = body?.rows;
            if (!Array.isArray(rows) || rows.length === 0) {
                throw new ApiError({
                    name: "ValidationError",
                    statusCode: HttpStatusCodes.BAD_REQUEST,
                    description: "rows array is required and must not be empty",
                });
            }

            const ranchIds = new Set<string>();
            for (const item of rows) {
                const ranch = item?.animal?.ranch_uuid;
                if (typeof ranch === "string" && ranch.trim()) {
                    ranchIds.add(ranch.trim());
                }
            }
            for (const ranchUuid of ranchIds) {
                assertRanchTokenAccess(req.user, ranchUuid);
            }

            const ctx: AnimalCreateContext = {
                jwtCompanyUuid: req.user?.uuid_company,
                isSaasOwner: this.isSaasOwner(req),
            };

            const response = await this.animalService.createBatch(rows, ctx);
            if (!response.success) {
                return res.status(response.code ?? 500).json(response);
            }

            const status = response.data && response.data.failed > 0 && response.data.created > 0 ? 207 : 201;
            return handleResponse(res, response, status);
        } catch (error) {
            next(error);
        }
    };

    createAnimal = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const animalBody = req.body as AnimalWriteRequestBody;
            if (animalBody.ranch_uuid) {
                assertRanchTokenAccess(req.user, animalBody.ranch_uuid);
            }

            const ctx: AnimalCreateContext = {
                jwtCompanyUuid: req.user?.uuid_company,
                isSaasOwner: this.isSaasOwner(req),
            };

            const response = await this.animalService.create(animalBody as AnimalCreationAttributes, ctx);

            if (!response.success) {
                return res.status(response.code ?? 500).json(response);
            }

            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    getAnimal = async (
        req: AuthRequest & Request<IGetAnimalParams, {}, {}, IncludeInactiveQuery>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { uuid_animal } = req.params;
            const { includeInactive } = buildGetByIdParams(req.query);
            const tenant = this.animalTenant(req);

            const response = await this.animalService.getById({
                id: uuid_animal,
                includeInactive,
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });

            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    getAnimals = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const params = buildGetAllParams(req.query);
            const requestedCompany = typeof req.query.uuid_company === "string" ? req.query.uuid_company : undefined;
            params.uuid_company = this.isSaasOwner(req) ? requestedCompany : req.user?.uuid_company;
            const ranchFilter = ranchFilterFromUser(req.user);
            if (ranchFilter?.length) {
                params.uuid_ranch_in = ranchFilter;
            }
            const ranchUuid = typeof req.query.ranch_uuid === "string" ? req.query.ranch_uuid.trim() : "";
            if (ranchUuid) {
                assertRanchTokenAccess(req.user, ranchUuid);
                params.ranch_uuid = ranchUuid;
            }
            const sexRaw = typeof req.query.sex === "string" ? req.query.sex.trim().toUpperCase() : "";
            if (sexRaw === "MALE" || sexRaw === "FEMALE") {
                params.sex = sexRaw;
            }

            const breedRaw = typeof req.query.breed_code === "string" ? req.query.breed_code.trim().toUpperCase() : "";
            if (breedRaw && isValidCattleBreedCode(breedRaw)) {
                params.breed_code = breedRaw;
            }

            const originRaw = typeof req.query.origin_type === "string" ? req.query.origin_type.trim().toUpperCase() : "";
            if (originRaw && this.isOriginType(originRaw)) {
                params.origin_type = originRaw;
            }

            const ownerUuid = this.optionalUuid(req.query.current_owner_uuid);
            if (ownerUuid) {
                params.current_owner_uuid = ownerUuid;
            }
            const paddockUuid = this.optionalUuid(req.query.current_paddock_uuid);
            if (paddockUuid) {
                params.current_paddock_uuid = paddockUuid;
            }

            const birthFrom = this.optionalIsoDate(req.query.birth_date_from);
            if (birthFrom) {
                params.birth_date_from = birthFrom;
            }
            const birthTo = this.optionalIsoDate(req.query.birth_date_to);
            if (birthTo) {
                params.birth_date_to = birthTo;
            }

            const exitRaw = typeof req.query.exit_type === "string" ? req.query.exit_type.trim().toUpperCase() : "";
            if (params.status === "inactive" && exitRaw && isAnimalExitType(exitRaw)) {
                params.exit_type = exitRaw;
            }

            const response = await this.animalService.getAll(params);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    updateAnimal = async (req: AuthRequest & Request<IUpdateAnimalParams>, res: Response, next: NextFunction) => {
        try {
            const { uuid_animal } = req.params;
            const animalBody = req.body as AnimalWriteRequestBody;
            const tenant = this.animalTenant(req);

            const existing = await this.animalService.getById({
                id: uuid_animal,
                includeInactive: false,
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            assertRanchTokenAccess(req.user, existing.data!.ranch_uuid);

            const response = await this.animalService.update(uuid_animal, animalBody as AnimalCreationAttributes, tenant);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    deactivateAnimal = async (
        req: AuthRequest & Request<IDeactivateAnimalParams>,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { uuid_animal } = req.params;
            const body = req.body as AnimalDeactivateRequestBody;
            const tenant = this.animalTenant(req);

            const existing = await this.animalService.getById({
                id: uuid_animal,
                includeInactive: false,
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            assertRanchTokenAccess(req.user, existing.data!.ranch_uuid);

            const response = await this.animalService.deactivateWithExit(uuid_animal, body, {
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    deactivateAnimalsBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = req.body as AnimalDeactivateBatchRequestBody;
            const tenant = this.animalTenant(req);
            const response = await this.animalService.deactivateBatchWithExit(body, {
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            const status = response.data && response.data.failed > 0 && response.data.success > 0 ? 207 : 200;
            return handleResponse(res, response, status);
        } catch (error) {
            next(error);
        }
    };

    deleteAnimal = async (req: AuthRequest & Request<IDeleteAnimalParams>, res: Response, next: NextFunction) => {
        try {
            const { uuid_animal } = req.params;
            const tenant = this.animalTenant(req);

            const existing = await this.animalService.getById({
                id: uuid_animal,
                includeInactive: false,
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            assertRanchTokenAccess(req.user, existing.data!.ranch_uuid);

            const response = await this.animalService.delete(uuid_animal, {
                uuid_company: tenant.uuid_company,
                uuid_ranch_in: tenant.uuid_ranch_in,
            });
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };
}

export default AnimalController;
