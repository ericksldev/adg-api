import { Response, NextFunction } from 'express';
import { AuthRequest } from '../interfaces/middleware/auth-middleware.interface';
import { verifyToken } from '../helpers/jwt.helper';
import ApiError from '../errors/apiError';
import httpStatus from '../errors/httpStatusCodes';
import { JwtPayload } from "../interfaces/common/jwt-payload.interface";
import { AUTHORIZATION_SCHEME_BEARER } from "../constants/auth.constants";
import { CompanyModel, SessionModel } from "../database/models";
import { normalizeUserRoles, UserRole } from "../interfaces/roles/roles.interface";
import { Op } from "sequelize";
import { computeAccessScope } from "../helpers/access-scope.helper";
import { isRenewalPastGrace } from "../helpers/membership-access.helper";

const isJwtPayload = (value: unknown): value is JwtPayload => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const payload = value as Partial<JwtPayload>;
    return typeof payload.sub === 'string'
        && typeof payload.username === 'string'
        && typeof payload.uuid_company === 'string';
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return next(new ApiError({
            name: 'AuthorizationHeaderMissing',
            statusCode: httpStatus.UNAUTHORIZED,
            description: 'Access token required',
            isOperational: true,
        }));
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== AUTHORIZATION_SCHEME_BEARER) {
        return next(new ApiError({
            name: 'InvalidAuthorizationScheme',
            statusCode: httpStatus.UNAUTHORIZED,
            description: 'Authorization scheme must be Bearer',
            isOperational: true,
        }));
    }

    if (!token) {
        return next(new ApiError({
            name: 'TokenMissing',
            statusCode: httpStatus.UNAUTHORIZED,
            description: 'Token not provided',
            isOperational: true,
        }));
    }

    try {
        const decoded = verifyToken(token);

        if (!isJwtPayload(decoded)) {
            throw new TypeError('Invalid token claims');
        }

        const fifteenHoursAgo = new Date(Date.now() - (15 * 60 * 60 * 1000));
        const activeSession = await SessionModel.findOne({
            where: {
                user_name: decoded.username,
                user_token: token,
                is_active: true,
                login_date: {
                    [Op.gte]: fifteenHoursAgo
                }
            }
        });

        if (!activeSession) {
            return next(new ApiError({
                name: 'SessionExpiredOrInvalid',
                statusCode: httpStatus.UNAUTHORIZED,
                description: 'Session expired or invalid. Please login again.',
                isOperational: true,
            }));
        }

        const roles = normalizeUserRoles(decoded.roles ?? []);
        decoded.roles = roles;

        decoded.access_scope = computeAccessScope(roles);

        const isSaasOwner = roles.includes(UserRole.SAAS_OWNER);
        if (!isSaasOwner) {
            const company = await CompanyModel.findOne({
                where: {
                    uuid_company: decoded.uuid_company
                }
            });

            if (!company?.is_active) {
                return next(new ApiError({
                    name: 'CompanyInactive',
                    statusCode: httpStatus.FORBIDDEN,
                    description: 'Company is inactive',
                    isOperational: true,
                }));
            }

            if (company.membership_renewal_at && isRenewalPastGrace(new Date(company.membership_renewal_at))) {
                company.is_active = false;
                company.membership_status = 'CANCELLED';
                await company.save();

                return next(new ApiError({
                    name: 'MembershipExpired',
                    statusCode: httpStatus.FORBIDDEN,
                    description: 'Membership expired. Company was automatically deactivated.',
                    isOperational: true,
                }));
            }
        }

        req.user = decoded;
        next();
    } catch {
        return next(new ApiError({
            name: 'InvalidToken',
            statusCode: httpStatus.UNAUTHORIZED,
            description: 'Token is invalid or expired',
            isOperational: true,
        }));
    }
};
