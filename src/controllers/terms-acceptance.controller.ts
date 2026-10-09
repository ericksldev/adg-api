import { NextFunction, Request, Response } from 'express';
import { handleResponse } from '../utils/response.handler';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import TermsAcceptanceService, { termsAccessUnavailable } from '../services/terms-acceptance.service';
import { TermsVersionWriteBody } from '../interfaces/terms/terms.interface';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';

function clientIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim()) {
        return forwarded.split(',')[0]?.trim() ?? null;
    }
    if (Array.isArray(forwarded) && forwarded[0]) {
        return forwarded[0].split(',')[0]?.trim() ?? null;
    }
    return req.ip ?? null;
}

function userAgent(req: Request): string | null {
    const header = req.headers['user-agent'];
    return typeof header === 'string' ? header : null;
}

function requireActor(req: AuthRequest): { uuidUser: string; uuidCompany: string } {
    const uuidUser = req.user?.sub;
    const uuidCompany = req.user?.uuid_company;
    if (!uuidUser || !uuidCompany) {
        throw new ApiError({
            name: 'OrganizationMembershipRequired',
            statusCode: HttpStatusCodes.FORBIDDEN,
            description: 'User is not associated with an organization',
        });
    }
    return { uuidUser, uuidCompany };
}

class TermsAcceptanceController {
    private readonly termsAcceptanceService: TermsAcceptanceService;

    constructor(termsAcceptanceService: TermsAcceptanceService) {
        this.termsAcceptanceService = termsAcceptanceService;
    }

    status = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { uuidUser, uuidCompany } = requireActor(req);
            const decision = await this.termsAcceptanceService.evaluateAccess(uuidUser, uuidCompany);
            return handleResponse(res, { success: true, data: decision });
        } catch (error) {
            if (error instanceof ApiError) {
                return next(error);
            }
            return handleResponse(res, { success: true, data: termsAccessUnavailable() });
        }
    };

    current = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { uuidUser, uuidCompany } = requireActor(req);
            const document = await this.termsAcceptanceService.getCurrentDocument(uuidUser, uuidCompany);
            return handleResponse(res, { success: true, data: document });
        } catch (error) {
            next(error);
        }
    };

    accept = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { uuidUser, uuidCompany } = requireActor(req);
            const body = (req.body ?? {}) as { uuid_terms_version?: string; accepted?: boolean };
            const response = await this.termsAcceptanceService.accept({
                uuid_user: uuidUser,
                uuid_company: uuidCompany,
                uuid_terms_version: body.uuid_terms_version ?? '',
                accepted: body.accepted === true,
                ip_address: clientIp(req),
                user_agent: userAgent(req),
            });
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    listVersions = async (_req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const response = await this.termsAcceptanceService.listVersions();
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };

    createVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const body = (req.body ?? {}) as TermsVersionWriteBody;
            const response = await this.termsAcceptanceService.createVersion(body);
            return handleResponse(res, response, 201);
        } catch (error) {
            next(error);
        }
    };

    publishVersion = async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const { uuid_terms_version } = req.params as { uuid_terms_version: string };
            const response = await this.termsAcceptanceService.publishVersion(uuid_terms_version);
            return handleResponse(res, response);
        } catch (error) {
            next(error);
        }
    };
}

export default TermsAcceptanceController;
