"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_helper_1 = require("../helpers/jwt.helper");
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const auth_constants_1 = require("../constants/auth.constants");
const models_1 = require("../database/models");
const roles_interface_1 = require("../interfaces/roles/roles.interface");
const sequelize_1 = require("sequelize");
const access_scope_helper_1 = require("../helpers/access-scope.helper");
const membership_access_helper_1 = require("../helpers/membership-access.helper");
const isJwtPayload = (value) => {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const payload = value;
    return typeof payload.sub === 'string'
        && typeof payload.username === 'string'
        && typeof payload.uuid_company === 'string';
};
const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return next(new apiError_1.default({
            name: 'AuthorizationHeaderMissing',
            statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
            description: 'Access token required',
            isOperational: true,
        }));
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== auth_constants_1.AUTHORIZATION_SCHEME_BEARER) {
        return next(new apiError_1.default({
            name: 'InvalidAuthorizationScheme',
            statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
            description: 'Authorization scheme must be Bearer',
            isOperational: true,
        }));
    }
    if (!token) {
        return next(new apiError_1.default({
            name: 'TokenMissing',
            statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
            description: 'Token not provided',
            isOperational: true,
        }));
    }
    try {
        const decoded = (0, jwt_helper_1.verifyToken)(token);
        if (!isJwtPayload(decoded)) {
            throw new TypeError('Invalid token claims');
        }
        const fifteenHoursAgo = new Date(Date.now() - (15 * 60 * 60 * 1000));
        const activeSession = await models_1.SessionModel.findOne({
            where: {
                user_name: decoded.username,
                user_token: token,
                is_active: true,
                login_date: {
                    [sequelize_1.Op.gte]: fifteenHoursAgo
                }
            }
        });
        if (!activeSession) {
            return next(new apiError_1.default({
                name: 'SessionExpiredOrInvalid',
                statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
                description: 'Session expired or invalid. Please login again.',
                isOperational: true,
            }));
        }
        const roles = (0, roles_interface_1.normalizeUserRoles)(decoded.roles ?? []);
        decoded.roles = roles;
        decoded.access_scope = (0, access_scope_helper_1.computeAccessScope)(roles);
        const isSaasOwner = roles.includes(roles_interface_1.UserRole.SAAS_OWNER);
        if (!isSaasOwner) {
            const company = await models_1.CompanyModel.findOne({
                where: {
                    uuid_company: decoded.uuid_company
                }
            });
            if (!company?.is_active) {
                return next(new apiError_1.default({
                    name: 'CompanyInactive',
                    statusCode: httpStatusCodes_1.default.FORBIDDEN,
                    description: 'Company is inactive',
                    isOperational: true,
                }));
            }
            if (company.membership_renewal_at && (0, membership_access_helper_1.isRenewalPastGrace)(new Date(company.membership_renewal_at))) {
                company.is_active = false;
                company.membership_status = 'CANCELLED';
                await company.save();
                return next(new apiError_1.default({
                    name: 'MembershipExpired',
                    statusCode: httpStatusCodes_1.default.FORBIDDEN,
                    description: 'Membership expired. Company was automatically deactivated.',
                    isOperational: true,
                }));
            }
        }
        req.user = decoded;
        next();
    }
    catch {
        return next(new apiError_1.default({
            name: 'InvalidToken',
            statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
            description: 'Token is invalid or expired',
            isOperational: true,
        }));
    }
};
exports.authenticate = authenticate;
