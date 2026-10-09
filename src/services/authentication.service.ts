import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ServiceResponse } from '../interfaces/common/service-response.interface';
import { LoginData, ResetPasswordData, LogoutData } from '../interfaces/authentication/authentication-data.interface';
import { IAuthenticationService } from '../interfaces/services/authentication-service.interface';
import {UserAttributes} from "../interfaces/user/user.interface";
import {IAuthenticationDBRepository} from "../interfaces/repositories/authentication-repository.interface";
import {ISessionService} from "../interfaces/services/session-service.interface";
import {SessionAttributes, SessionCreationAttributes} from "../interfaces/session/session.interface";
import ApiError from "../errors/apiError";
import HttpStatusCodes from "../errors/httpStatusCodes";
import {envConfig} from "../config";
import {IUserManagerServiceInterface} from "../interfaces/services/user-service.interface";
import { UserRole } from "../interfaces/roles/roles.interface";
import { computeAccessScope } from "../helpers/access-scope.helper";
import { SESSION_EXPIRATION_TIME } from "../constants/auth.constants";
import { IMembershipRepository } from "../interfaces/repositories/membership-repository.interface";
import { CompanyModel } from "../database/models";
import { normalizeLoginCredential } from '../utils/login-credential.util';
import TermsAcceptanceService, { termsAccessUnavailable } from './terms-acceptance.service';

class AuthenticationService implements IAuthenticationService {
    private readonly authenticationRepository: IAuthenticationDBRepository;
    private readonly sessionService: ISessionService<SessionAttributes>;
    private readonly SESSION_EXPIRATION_TIME = SESSION_EXPIRATION_TIME;
    private readonly userManagerService: IUserManagerServiceInterface<UserAttributes>;
    private readonly membershipRepository: IMembershipRepository;
    private readonly termsAcceptanceService: TermsAcceptanceService;

    constructor(
        authenticationRepository: IAuthenticationDBRepository,
        sessionService: ISessionService<SessionAttributes>,
        userManagerService: IUserManagerServiceInterface<UserAttributes>,
        membershipRepository: IMembershipRepository,
        termsAcceptanceService: TermsAcceptanceService
    ) {
        this.authenticationRepository = authenticationRepository;
        this.sessionService = sessionService;
        this.userManagerService = userManagerService;
        this.membershipRepository = membershipRepository;
        this.termsAcceptanceService = termsAcceptanceService;
    }

    async login(data: LoginData): Promise<ServiceResponse<any>> {
        const { user_name, password } = data;

        const login = normalizeLoginCredential(user_name);

        if (!login) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Username is required'
            });
        }

        const userRow = await this.authenticationRepository.findActiveUserForLogin(login);

        if (!userRow) {
            throw new ApiError({
                name: 'Unauthorized',
                statusCode: HttpStatusCodes.UNAUTHORIZED,
                description: 'Wrong user'
            });
        }

        const passwordValid = await bcrypt.compare(password, userRow.password);

        if (!passwordValid) {
            throw new ApiError({
                name: 'Unauthorized',
                statusCode: HttpStatusCodes.UNAUTHORIZED,
                description: 'Wrong password'
            });
        }

        const user = userRow.get({ plain: true }) as UserAttributes;

        const sessionIdentifiers = new Set(
            [login, user.username, user.email].map((s) => s?.trim()).filter((s): s is string => Boolean(s))
        );
        for (const id of sessionIdentifiers) {
            await this.sessionService.deactivateExpiredSessions(id);
            await this.sessionService.logout(id);
        }
        const membershipRoles = await this.membershipRepository.findActiveRolesByUser(
            user.uuid_user,
            user.uuid_company
        );
        const roles = membershipRoles.length > 0
            ? membershipRoles
            : [UserRole.RANCH_STAFF];

        const access_scope = computeAccessScope(roles);
        /** Operational scope is company-wide; ranch UUIDs are not embedded in JWT (legacy `single_ranch` unused). */
        const ranch_uuids: string[] = [];

        const company = await CompanyModel.findOne({
            where: {
                uuid_company: user.uuid_company,
                is_active: true
            }
        });

        const secret = envConfig.JWT_SECRET?.trim();
        if (!secret) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'JWT_SECRET is not configured',
            });
        }

        const membershipRenewalIso = (): string | undefined => {
            const raw = company?.membership_renewal_at;
            if (raw == null) {
                return undefined;
            }
            const dt = raw instanceof Date ? raw : new Date(raw as string | number);
            return Number.isNaN(dt.getTime()) ? undefined : dt.toISOString();
        };

        const token = jwt.sign(
            {
                sub: user.uuid_user,
                username: user.username,
                uuid_company: user.uuid_company,
                roles,
                access_scope,
                ranch_uuids,
                membership_status: company?.membership_status,
                membership_renewal_at: membershipRenewalIso(),
            },
            secret,
            { expiresIn: this.SESSION_EXPIRATION_TIME }
        );

        const session: SessionCreationAttributes = {
            user_name: user.username,
            user_token: token,
            is_active: true,
            login_date: new Date(),
        };

        const sessionResponse = await this.sessionService.createSession(session);

        if (!sessionResponse.success) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Failed to create session'
            });
        }

        let terms = termsAccessUnavailable();
        try {
            terms = await this.termsAcceptanceService.evaluateAccess(user.uuid_user, user.uuid_company);
        } catch {
            terms = termsAccessUnavailable();
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

    async logout(data: LogoutData, currentUsername?: string): Promise<ServiceResponse<null>> {
        const usernameToLogout = currentUsername ?? data.user_name;

        if (!usernameToLogout || usernameToLogout.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Username is required'
            });
        }

        const response = await this.sessionService.logout(usernameToLogout);

        if (!response) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Logout failed or user not found'
            });
        }

        return { success: true, data: null };
    }

    async requestNewPassword(): Promise<ServiceResponse<null>> {
        return {
            success: false,
            error: 'RequestNewPassword not implemented yet',
            code: 501,
        };
    }

    async resetPassword(data: ResetPasswordData): Promise<ServiceResponse<any>> {
        const { uuid_user, code, password } = data;

        if (!uuid_user) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_user is required'
            });
        }

        const userExists = await this.authenticationRepository.validateUserId(uuid_user);

        if (!userExists) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Wrong user'
            });
        }

        const validCode = await this.authenticationRepository.validateCode(uuid_user, code);

        if (!validCode) {
            throw new ApiError({
                name: 'BadRequest',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Invalid code. Request a new one.'
            });
        }

        const updatedUser = await this.userManagerService.resetPassword(
            uuid_user,
            password
        );

        if (!updatedUser.success) {
            throw new ApiError({
                name: 'BadRequest',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Error updating password'
            });
        }

        return {
            success: true,
            data: null,
        };
    }
}

export default AuthenticationService;
