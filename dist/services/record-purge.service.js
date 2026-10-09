"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const EXIT_REASON_BY_STATUS = {
    SOLD: 'EXIT_SOLD',
    DISPOSED: 'EXIT_DISPOSED',
    DEAD: 'EXIT_DEAD',
    MISSING: 'EXIT_MISSING',
    INACTIVE: 'EXIT_INACTIVE',
};
function pageWindow(page, size) {
    const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = Number.isFinite(size) && size > 0 ? Math.min(50, Math.floor(size)) : 10;
    return { currentPage, pageSize, offset: (currentPage - 1) * pageSize };
}
function pagination(totalItems, currentPage, pageSize) {
    return {
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        currentPage,
        order: 'DESC',
        pageSize,
    };
}
function animalReasons(status) {
    const reasons = ['INACTIVE', 'NO_OPEN_SESSION', 'NO_ACTIVE_OFFSPRING'];
    const exitReason = EXIT_REASON_BY_STATUS[status];
    if (exitReason) {
        reasons.splice(1, 0, exitReason);
    }
    return reasons;
}
function sessionReasons(row) {
    const reasons = [];
    if (row.status === 'CLOSED') {
        reasons.push('CLOSED');
    }
    if (row.status === 'DRAFT') {
        reasons.push('NEVER_STARTED');
    }
    const animalCount = Number(row.animal_count ?? 0);
    const activeAnimalCount = Number(row.active_animal_count ?? 0);
    if (animalCount === 0) {
        reasons.push('NO_ANIMALS');
    }
    else if (activeAnimalCount === 0) {
        reasons.push('ALL_ANIMALS_INACTIVE');
    }
    return reasons;
}
function activityCodes(value) {
    if (Array.isArray(value)) {
        return value.map((code) => String(code)).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((code) => String(code)).filter(Boolean);
            }
        }
        catch {
            return [];
        }
    }
    return [];
}
function toAnimalCandidate(row) {
    return {
        animal_uuid: row.animal_uuid,
        registration_number: row.registration_number,
        chip_number: row.chip_number,
        sex: row.sex,
        current_status: row.current_status,
        ranch_name: row.ranch_name,
        confirm_token: row.registration_number,
        reasons: animalReasons(row.current_status),
    };
}
function toSessionCandidate(row) {
    const workDate = String(row.work_date).slice(0, 10);
    return {
        uuid_corral_work_session: row.uuid_corral_work_session,
        work_date: workDate,
        status: row.status,
        responsible_person: row.responsible_person,
        ranch_name: row.ranch_name,
        activity_codes: activityCodes(row.activity_codes),
        confirm_token: workDate,
        reasons: sessionReasons(row),
    };
}
function compactLabel(value) {
    return value.trim().slice(0, 160);
}
class RecordPurgeService {
    constructor(repository) {
        this.repository = repository;
    }
    async listAnimalCandidates(page, size, search) {
        const window = pageWindow(page, size);
        const result = await this.repository.listAnimalCandidates({
            search: search?.trim() || undefined,
            limit: window.pageSize,
            offset: window.offset,
        });
        return {
            success: true,
            data: result.rows.map(toAnimalCandidate),
            pagination: pagination(result.count, window.currentPage, window.pageSize),
        };
    }
    async listWorkSessionCandidates(page, size, search) {
        const window = pageWindow(page, size);
        const result = await this.repository.listWorkSessionCandidates({
            search: search?.trim() || undefined,
            limit: window.pageSize,
            offset: window.offset,
        });
        return {
            success: true,
            data: result.rows.map(toSessionCandidate),
            pagination: pagination(result.count, window.currentPage, window.pageSize),
        };
    }
    async purgeAnimal(animalUuid, actor) {
        const candidate = await this.repository.findAnimalCandidate(animalUuid);
        if (!candidate) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Animal is not a permanent deletion candidate',
            });
        }
        const mapped = toAnimalCandidate(candidate);
        const deleted = await this.repository.purgeAnimal(animalUuid, {
            kind: 'A',
            label: compactLabel(`${mapped.registration_number}|${mapped.ranch_name}`),
            reasons: mapped.reasons.join(',').slice(0, 96),
            actor: actor.trim() || 'unknown',
        });
        if (!deleted) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Animal is not a permanent deletion candidate',
            });
        }
        return { success: true, data: null };
    }
    async purgeWorkSession(sessionUuid, actor) {
        const candidate = await this.repository.findWorkSessionCandidate(sessionUuid);
        if (!candidate) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Work session is not a permanent deletion candidate',
            });
        }
        const mapped = toSessionCandidate(candidate);
        const deleted = await this.repository.purgeWorkSession(sessionUuid, {
            kind: 'W',
            label: compactLabel(`${mapped.work_date}|${mapped.ranch_name}`),
            reasons: mapped.reasons.join(',').slice(0, 96),
            actor: actor.trim() || 'unknown',
        });
        if (!deleted) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Work session is not a permanent deletion candidate',
            });
        }
        return { success: true, data: null };
    }
    async listAudits(page, size) {
        const window = pageWindow(page, size);
        const result = await this.repository.listAudits({
            limit: window.pageSize,
            offset: window.offset,
        });
        return {
            success: true,
            data: result.rows,
            pagination: pagination(result.count, window.currentPage, window.pageSize),
        };
    }
}
exports.default = RecordPurgeService;
