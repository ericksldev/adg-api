"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const roles_interface_1 = require("../interfaces/roles/roles.interface");
const access_scope_helper_1 = require("../helpers/access-scope.helper");
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const response_handler_1 = require("../utils/response.handler");
const query_parser_1 = require("../utils/query.parser");
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class AnimalAttendanceController {
    constructor(animalAttendanceService) {
        this.animalAttendanceService = animalAttendanceService;
        this.review = async (req, res, next) => {
            try {
                const ranchUuid = this.requiredUuid(req.query.ranch_uuid, 'ranch_uuid');
                (0, access_scope_helper_1.assertRanchTokenAccess)(req.user, ranchUuid);
                const response = await this.animalAttendanceService.review({
                    ranch_uuid: ranchUuid,
                    from: this.optionalDate(req.query.from, 'from'),
                    to: this.optionalDate(req.query.to, 'to'),
                    paddock_uuid: this.optionalUuid(req.query.paddock_uuid, 'paddock_uuid'),
                    animal_uuid: this.optionalUuid(req.query.animal_uuid, 'animal_uuid'),
                    attendance_status: this.optionalMark(req.query.attendance_status),
                    page: (0, query_parser_1.parseNumber)(this.queryString(req.query.page), 1),
                    size: (0, query_parser_1.parseNumber)(this.queryString(req.query.size), 25),
                    uuid_company: this.isSaasOwner(req) ? undefined : req.user?.uuid_company,
                });
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
    }
    isSaasOwner(req) {
        return (req.user?.roles ?? []).includes(roles_interface_1.UserRole.SAAS_OWNER);
    }
    queryString(value) {
        return typeof value === 'string' ? value : undefined;
    }
    requiredUuid(value, field) {
        const uuid = this.optionalUuid(value, field);
        if (!uuid) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${field} query parameter is required`,
            });
        }
        return uuid;
    }
    optionalUuid(value, field) {
        if (value == null || value === '') {
            return undefined;
        }
        if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${field} must be a valid uuid`,
            });
        }
        return value.trim();
    }
    optionalDate(value, field) {
        if (value == null || value === '') {
            return undefined;
        }
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${field} must be a date in YYYY-MM-DD format`,
            });
        }
        const trimmed = value.trim();
        const date = new Date(`${trimmed}T00:00:00.000Z`);
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${field} must be a date in YYYY-MM-DD format`,
            });
        }
        return trimmed;
    }
    optionalMark(value) {
        if (value == null || value === '' || value === 'ALL') {
            return undefined;
        }
        if (value === 'PRESENT' || value === 'ABSENT') {
            return value;
        }
        throw new apiError_1.default({
            name: 'ValidationError',
            statusCode: httpStatusCodes_1.default.BAD_REQUEST,
            description: 'attendance_status must be PRESENT or ABSENT',
        });
    }
}
exports.default = AnimalAttendanceController;
