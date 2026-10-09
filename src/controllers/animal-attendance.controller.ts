import { NextFunction, Response } from 'express';
import { UserRole } from '../interfaces/roles/roles.interface';
import { assertRanchTokenAccess } from '../helpers/access-scope.helper';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import { AnimalAttendanceMark } from '../interfaces/animal-attendance/animal-attendance.interface';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import AnimalAttendanceService from '../services/animal-attendance.service';
import { handleResponse } from '../utils/response.handler';
import { parseNumber } from '../utils/query.parser';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class AnimalAttendanceController {
    constructor(private readonly animalAttendanceService: AnimalAttendanceService) {}

    review = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const ranchUuid = this.requiredUuid(req.query.ranch_uuid, 'ranch_uuid');
            assertRanchTokenAccess(req.user, ranchUuid);

            const response = await this.animalAttendanceService.review({
                ranch_uuid: ranchUuid,
                from: this.optionalDate(req.query.from, 'from'),
                to: this.optionalDate(req.query.to, 'to'),
                paddock_uuid: this.optionalUuid(req.query.paddock_uuid, 'paddock_uuid'),
                animal_uuid: this.optionalUuid(req.query.animal_uuid, 'animal_uuid'),
                attendance_status: this.optionalMark(req.query.attendance_status),
                page: parseNumber(this.queryString(req.query.page), 1),
                size: parseNumber(this.queryString(req.query.size), 25),
                uuid_company: this.isSaasOwner(req) ? undefined : req.user?.uuid_company,
            });

            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    private isSaasOwner(req: AuthRequest): boolean {
        return (req.user?.roles ?? []).includes(UserRole.SAAS_OWNER);
    }

    private queryString(value: unknown): string | undefined {
        return typeof value === 'string' ? value : undefined;
    }

    private requiredUuid(value: unknown, field: string): string {
        const uuid = this.optionalUuid(value, field);
        if (!uuid) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} query parameter is required`,
            });
        }
        return uuid;
    }

    private optionalUuid(value: unknown, field: string): string | undefined {
        if (value == null || value === '') {
            return undefined;
        }
        if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} must be a valid uuid`,
            });
        }
        return value.trim();
    }

    private optionalDate(value: unknown, field: string): string | undefined {
        if (value == null || value === '') {
            return undefined;
        }
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} must be a date in YYYY-MM-DD format`,
            });
        }
        const trimmed = value.trim();
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} must be a date in YYYY-MM-DD format`,
            });
        }
        return trimmed;
    }

    private optionalMark(value: unknown): AnimalAttendanceMark | undefined {
        if (value == null || value === '' || value === 'ALL') {
            return undefined;
        }
        if (value === 'PRESENT' || value === 'ABSENT') {
            return value;
        }
        throw new ApiError({
            name: 'ValidationError',
            statusCode: HttpStatusCodes.BAD_REQUEST,
            description: 'attendance_status must be PRESENT or ABSENT',
        });
    }
}

export default AnimalAttendanceController;
