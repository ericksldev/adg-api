"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireTermsAcceptance = void 0;
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
function descriptionFor(reason) {
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
function errorNameFor(reason) {
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
const requireTermsAcceptance = (termsAcceptanceService) => {
    return async (req, _res, next) => {
        const uuidUser = req.user?.sub;
        const uuidCompany = req.user?.uuid_company;
        if (!uuidUser || !uuidCompany) {
            return next(new apiError_1.default({
                name: 'OrganizationMembershipRequired',
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: 'User is not associated with an organization',
                isOperational: true,
            }));
        }
        try {
            const decision = await termsAcceptanceService.evaluateAccess(uuidUser, uuidCompany);
            if (decision.access_granted) {
                return next();
            }
            return next(new apiError_1.default({
                name: errorNameFor(decision.block_reason),
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: descriptionFor(decision.block_reason),
                isOperational: true,
            }));
        }
        catch {
            return next(new apiError_1.default({
                name: 'TermsAcceptanceCheckFailed',
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: 'Terms acceptance could not be verified',
                isOperational: true,
            }));
        }
    };
};
exports.requireTermsAcceptance = requireTermsAcceptance;
