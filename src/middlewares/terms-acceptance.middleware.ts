import { NextFunction, Response } from 'express';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import TermsAcceptanceService from '../services/terms-acceptance.service';
import { TermsBlockReason } from '../interfaces/terms/terms.interface';

function descriptionFor(reason: TermsBlockReason): string {
    switch (reason) {
        case 'acceptance_required':
            return 'Current terms of service must be accepted before using Vrete';
        case 'organization_missing':
            return 'User is not associated with an organization';
        case 'membership_invalid':
            return 'Organization does not have a valid membership';
        case 'terms_unavailable':
            return 'Terms acceptance could not be verified';
        default:
            return 'Access denied';
    }
}

function errorNameFor(reason: TermsBlockReason): string {
    if (reason === 'acceptance_required') {
        return 'TermsAcceptanceRequired';
    }
    if (reason === 'terms_unavailable') {
        return 'TermsAcceptanceCheckFailed';
    }
    return 'OrganizationMembershipRequired';
}

/**
 * Blocks protected routes unless the authenticated user has accepted the current
 * obligatory terms version for their organization. A lookup failure denies access.
 */
export const requireTermsAcceptance = (
    termsAcceptanceService: Pick<TermsAcceptanceService, 'evaluateAccess'>
) => {
    return async (req: AuthRequest, _res: Response, next: NextFunction) => {
        const uuidUser = req.user?.sub;
        const uuidCompany = req.user?.uuid_company;

        if (!uuidUser || !uuidCompany) {
            return next(new ApiError({
                name: 'OrganizationMembershipRequired',
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: 'User is not associated with an organization',
                isOperational: true,
            }));
        }

        try {
            const decision = await termsAcceptanceService.evaluateAccess(uuidUser, uuidCompany);
            if (decision.access_granted) {
                return next();
            }

            return next(new ApiError({
                name: errorNameFor(decision.block_reason),
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: descriptionFor(decision.block_reason),
                isOperational: true,
            }));
        } catch {
            return next(new ApiError({
                name: 'TermsAcceptanceCheckFailed',
                statusCode: HttpStatusCodes.FORBIDDEN,
                description: 'Terms acceptance could not be verified',
                isOperational: true,
            }));
        }
    };
};
