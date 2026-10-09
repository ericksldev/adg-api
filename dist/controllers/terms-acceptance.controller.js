"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const response_handler_1 = require("../utils/response.handler");
const terms_acceptance_service_1 = require("../services/terms-acceptance.service");
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0]?.trim() ?? null;
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].split(',')[0]?.trim() ?? null;
    }
    return req.ip ?? null;
}
function userAgent(req) {
    const header = req.headers['user-agent'];
    return typeof header === 'string' ? header : null;
}
function requireActor(req) {
    const uuidUser = req.user?.sub;
    const uuidCompany = req.user?.uuid_company;
    if (!uuidUser || !uuidCompany) {
        throw new apiError_1.default({
            name: 'OrganizationMembershipRequired',
            statusCode: httpStatusCodes_1.default.FORBIDDEN,
            description: 'User is not associated with an organization',
        });
    }
    return { uuidUser, uuidCompany };
}
class TermsAcceptanceController {
    constructor(termsAcceptanceService) {
        this.status = async (req, res, next) => {
            try {
                const { uuidUser, uuidCompany } = requireActor(req);
                const decision = await this.termsAcceptanceService.evaluateAccess(uuidUser, uuidCompany);
                return (0, response_handler_1.handleResponse)(res, { success: true, data: decision });
            }
            catch (error) {
                if (error instanceof apiError_1.default) {
                    return next(error);
                }
                return (0, response_handler_1.handleResponse)(res, { success: true, data: (0, terms_acceptance_service_1.termsAccessUnavailable)() });
            }
        };
        this.current = async (req, res, next) => {
            try {
                const { uuidUser, uuidCompany } = requireActor(req);
                const document = await this.termsAcceptanceService.getCurrentDocument(uuidUser, uuidCompany);
                return (0, response_handler_1.handleResponse)(res, { success: true, data: document });
            }
            catch (error) {
                next(error);
            }
        };
        this.accept = async (req, res, next) => {
            try {
                const { uuidUser, uuidCompany } = requireActor(req);
                const body = (req.body ?? {});
                const response = await this.termsAcceptanceService.accept({
                    uuid_user: uuidUser,
                    uuid_company: uuidCompany,
                    uuid_terms_version: body.uuid_terms_version ?? '',
                    accepted: body.accepted === true,
                    ip_address: clientIp(req),
                    user_agent: userAgent(req),
                });
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.listVersions = async (_req, res, next) => {
            try {
                const response = await this.termsAcceptanceService.listVersions();
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.createVersion = async (req, res, next) => {
            try {
                const body = (req.body ?? {});
                const response = await this.termsAcceptanceService.createVersion(body);
                return (0, response_handler_1.handleResponse)(res, response, 201);
            }
            catch (error) {
                next(error);
            }
        };
        this.publishVersion = async (req, res, next) => {
            try {
                const { uuid_terms_version } = req.params;
                const response = await this.termsAcceptanceService.publishVersion(uuid_terms_version);
                return (0, response_handler_1.handleResponse)(res, response);
            }
            catch (error) {
                next(error);
            }
        };
        this.termsAcceptanceService = termsAcceptanceService;
    }
}
exports.default = TermsAcceptanceController;
