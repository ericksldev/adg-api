import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import { ServiceResponse } from '../interfaces/common/service-response.interface';
import {
    AnimalPurgeCandidate,
    AnimalPurgeCandidateRow,
    RecordDeletionAuditItem,
    WorkSessionPurgeCandidate,
    WorkSessionPurgeCandidateRow,
} from '../interfaces/record-purge/record-purge.interface';
import RecordPurgeRepository from '../repositories/record-purge.repository';

const EXIT_REASON_BY_STATUS: Record<string, string> = {
    SOLD: 'EXIT_SOLD',
    DISPOSED: 'EXIT_DISPOSED',
    DEAD: 'EXIT_DEAD',
    MISSING: 'EXIT_MISSING',
    INACTIVE: 'EXIT_INACTIVE',
};

function pageWindow(page: number, size: number): { currentPage: number; pageSize: number; offset: number } {
    const currentPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const pageSize = Number.isFinite(size) && size > 0 ? Math.min(50, Math.floor(size)) : 10;
    return { currentPage, pageSize, offset: (currentPage - 1) * pageSize };
}

function pagination(totalItems: number, currentPage: number, pageSize: number) {
    return {
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
        currentPage,
        order: 'DESC',
        pageSize,
    };
}

function animalReasons(status: string): string[] {
    const reasons = ['INACTIVE', 'NO_OPEN_SESSION', 'NO_ACTIVE_OFFSPRING'];
    const exitReason = EXIT_REASON_BY_STATUS[status];
    if (exitReason) {
        reasons.splice(1, 0, exitReason);
    }
    return reasons;
}

function sessionReasons(row: WorkSessionPurgeCandidateRow): string[] {
    const reasons: string[] = [];
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
    } else if (activeAnimalCount === 0) {
        reasons.push('ALL_ANIMALS_INACTIVE');
    }
    return reasons;
}

function activityCodes(value: WorkSessionPurgeCandidateRow['activity_codes'] | string): string[] {
    if (Array.isArray(value)) {
        return value.map((code) => String(code)).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value) as unknown;
            if (Array.isArray(parsed)) {
                return parsed.map((code) => String(code)).filter(Boolean);
            }
        } catch {
            return [];
        }
    }
    return [];
}

function toAnimalCandidate(row: AnimalPurgeCandidateRow): AnimalPurgeCandidate {
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

function toSessionCandidate(row: WorkSessionPurgeCandidateRow): WorkSessionPurgeCandidate {
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

function compactLabel(value: string): string {
    return value.trim().slice(0, 160);
}

export default class RecordPurgeService {
    private readonly repository: RecordPurgeRepository;

    constructor(repository: RecordPurgeRepository) {
        this.repository = repository;
    }

    async listAnimalCandidates(
        page: number,
        size: number,
        search?: string
    ): Promise<ServiceResponse<AnimalPurgeCandidate[]>> {
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

    async listWorkSessionCandidates(
        page: number,
        size: number,
        search?: string
    ): Promise<ServiceResponse<WorkSessionPurgeCandidate[]>> {
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

    async purgeAnimal(animalUuid: string, actor: string): Promise<ServiceResponse<null>> {
        const candidate = await this.repository.findAnimalCandidate(animalUuid);
        if (!candidate) {
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
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
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'Animal is not a permanent deletion candidate',
            });
        }

        return { success: true, data: null };
    }

    async purgeWorkSession(sessionUuid: string, actor: string): Promise<ServiceResponse<null>> {
        const candidate = await this.repository.findWorkSessionCandidate(sessionUuid);
        if (!candidate) {
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
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
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'Work session is not a permanent deletion candidate',
            });
        }

        return { success: true, data: null };
    }

    async listAudits(page: number, size: number): Promise<ServiceResponse<RecordDeletionAuditItem[]>> {
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
