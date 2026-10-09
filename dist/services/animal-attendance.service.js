"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 200;
class AnimalAttendanceService {
    constructor(repository) {
        this.repository = repository;
    }
    async review(params) {
        const ranchUuid = params.ranch_uuid.trim();
        const animalUuid = params.animal_uuid?.trim() || undefined;
        const paddockUuid = animalUuid ? undefined : params.paddock_uuid?.trim() || undefined;
        const from = params.from?.trim() || undefined;
        const to = params.to?.trim() || undefined;
        if (!animalUuid && (!from || !to)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'from and to are required',
            });
        }
        if ((from && !to) || (!from && to)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'from and to must be provided together',
            });
        }
        if (from && to && from > to) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'from must be on or before to',
            });
        }
        const ranch = await this.repository.findActiveRanch(ranchUuid);
        if (!ranch) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Ranch not found',
            });
        }
        if (params.uuid_company && ranch.uuid_company !== params.uuid_company) {
            throw new apiError_1.default({
                name: 'Forbidden',
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: 'Ranch is outside your company',
            });
        }
        if (paddockUuid) {
            const paddock = await this.repository.findActivePaddock(paddockUuid);
            if (!paddock || paddock.ranch_uuid !== ranchUuid) {
                throw new apiError_1.default({
                    name: 'ValidationError',
                    statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                    description: 'Paddock not found',
                });
            }
        }
        if (animalUuid) {
            const animal = await this.repository.findAnimalInRanch(animalUuid, ranchUuid);
            if (!animal) {
                throw new apiError_1.default({
                    name: 'NotFound',
                    statusCode: httpStatusCodes_1.default.NOT_FOUND,
                    description: 'Animal not found',
                });
            }
        }
        const scope = this.resolveScope(animalUuid, paddockUuid);
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.size || DEFAULT_PAGE_SIZE));
        const requestedPage = Math.max(1, params.page || 1);
        const filters = {
            ranchUuid,
            from,
            to,
            paddockUuid,
            animalUuid,
            attendanceStatus: animalUuid ? undefined : params.attendance_status,
            restrictToActiveInventory: !animalUuid,
            page: requestedPage,
            size: animalUuid ? 1 : pageSize,
        };
        const summary = await this.repository.summarize(filters);
        const totalItems = animalUuid ? 1 : await this.repository.countRows(filters);
        const totalPages = Math.max(1, Math.ceil(totalItems / filters.size));
        const currentPage = Math.min(filters.page, totalPages);
        const rows = await this.repository.findRows({ ...filters, page: currentPage });
        if (animalUuid && rows[0]) {
            rows[0].history = await this.repository.findHistory(filters);
        }
        return {
            success: true,
            data: {
                scope,
                ranch_uuid: ranchUuid,
                paddock_uuid: paddockUuid ?? null,
                animal_uuid: animalUuid ?? null,
                from: from ?? null,
                to: to ?? null,
                summary,
                animals: rows,
            },
            pagination: {
                totalItems,
                totalPages,
                currentPage,
                order: 'ASC',
                pageSize: filters.size,
            },
        };
    }
    resolveScope(animalUuid, paddockUuid) {
        if (animalUuid) {
            return 'ANIMAL';
        }
        if (paddockUuid) {
            return 'PADDOCK';
        }
        return 'INVENTORY';
    }
}
exports.default = AnimalAttendanceService;
