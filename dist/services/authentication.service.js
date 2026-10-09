"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const config_1 = require("../config");
const roles_interface_1 = require("../interfaces/roles/roles.interface");
const access_scope_helper_1 = require("../helpers/access-scope.helper");
const auth_constants_1 = require("../constants/auth.constants");
const models_1 = require("../database/models");
const login_credential_util_1 = require("../utils/login-credential.util");
const terms_acceptance_service_1 = require("./terms-acceptance.service");
class AuthenticationService {
    constructor(authenticationRepository, sessionService, userManagerService, membershipRepository, termsAcceptanceService) {
        this.SESSION_EXPIRATION_TIME = auth_constants_1.SESSION_EXPIRATION_TIME;
        this.authenticationRepository = authenticationRepository;
        this.sessionService = sessionService;
        this.userManagerService = userManagerService;
        this.membershipRepository = membershipRepository;
        this.termsAcceptanceService = termsAcceptanceService;
    }
    async login(data) {
        const { user_name, password } = data;
        const login = (0, login_credential_util_1.normalizeLoginCredential)(user_name);
        if (!login) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const userRow = await this.authenticationRepository.findActiveUserForLogin(login);
        if (!userRow) {
            throw new apiError_1.default({
                name: 'Unauthorized',
                statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
                description: 'Wrong user'
            });
        }
        const passwordValid = await bcryptjs_1.default.compare(password, userRow.password);
        if (!passwordValid) {
            throw new apiError_1.default({
                name: 'Unauthorized',
                statusCode: httpStatusCodes_1.default.UNAUTHORIZED,
                description: 'Wrong password'
            });
        }
        const user = userRow.get({ plain: true });
        const sessionIdentifiers = new Set([login, user.username, user.email].map((s) => s?.trim()).filter((s) => Boolean(s)));
        for (const id of sessionIdentifiers) {
            await this.sessionService.deactivateExpiredSessions(id);
            await this.sessionService.logout(id);
        }
        const membershipRoles = await this.membershipRepository.findActiveRolesByUser(user.uuid_user, user.uuid_company);
        const roles = membershipRoles.length > 0
            ? membershipRoles
            : [roles_interface_1.UserRole.RANCH_STAFF];
        const access_scope = (0, access_scope_helper_1.computeAccessScope)(roles);
        /** Operational scope is company-wide; ranch UUIDs are not embedded in JWT (legacy `single_ranch` unused). */
        const ranch_uuids = [];
        const company = await models_1.CompanyModel.findOne({
            where: {
                uuid_company: user.uuid_company,
                is_active: true
            }
        });
        const secret = config_1.envConfig.JWT_SECRET?.trim();
        if (!secret) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'JWT_SECRET is not configured',
            });
        }
        const membershipRenewalIso = () => {
            const raw = company?.membership_renewal_at;
            if (raw == null) {
                return undefined;
            }
            const dt = raw instanceof Date ? raw : new Date(raw);
            return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
        };
        const token = jsonwebtoken_1.default.sign({
            sub: user.uuid_user,
            username: user.username,
            uuid_company: user.uuid_company,
            roles,
            access_scope,
            ranch_uuids,
            membership_status: company?.membership_status,
            membership_renewal_at: membershipRenewalIso(),
        }, secret, { expiresIn: this.SESSION_EXPIRATION_TIME });
        const session = {
            user_name: user.username,
            user_token: token,
            is_active: true,
            login_date: new Date(),
        };
        const sessionResponse = await this.sessionService.createSession(session);
        if (!sessionResponse.success) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'Failed to create session'
            });
        }
        let terms = (0, terms_acceptance_service_1.termsAccessUnavailable)();
        try {
            terms = await this.termsAcceptanceService.evaluateAccess(user.uuid_user, user.uuid_company);
        }
        catch {
            terms = (0, terms_acceptance_service_1.termsAccessUnavailable)();
        }
        const { password: _password, ...publicUser } = user;
        void _password;
        return {
            success: true,
            data: {
                session: sessionResponse.data,
                user: publicUser,
                token,
                terms,
            },
        };
    }
    async logout(data, currentUsername) {
        const usernameToLogout = currentUsername ?? data.user_name;
        if (!usernameToLogout || usernameToLogout.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const response = await this.sessionService.logout(usernameToLogout);
        if (!response) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Logout failed or user not found'
            });
        }
        return { success: true, data: null };
    }
    async requestNewPassword() {
        return {
            success: false,
            error: 'RequestNewPassword not implemented yet',
            code: 501,
        };
    }
    async resetPassword(data) {
        const { uuid_user, code, password } = data;
        if (!uuid_user) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_user is required'
            });
        }
        const userExists = await this.authenticationRepository.validateUserId(uuid_user);
        if (!userExists) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Wrong user'
            });
        }
        const validCode = await this.authenticationRepository.validateCode(uuid_user, code);
        if (!validCode) {
            throw new apiError_1.default({
                name: 'BadRequest',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Invalid code. Request a new one.'
            });
        }
        const updatedUser = await this.userManagerService.resetPassword(uuid_user, password);
        if (!updatedUser.success) {
            throw new apiError_1.default({
                name: 'BadRequest',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Error updating password'
            });
        }
        return {
            success: true,
            data: null,
        };
    }
}
exports.default = AuthenticationService;
