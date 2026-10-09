"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../database/models");
const roles_interface_1 = require("../interfaces/roles/roles.interface");
const saas_plan_constants_1 = require("../constants/saas-plan.constants");
class UserService {
    constructor(userRepository, userManagerRepository, companyService, passwordValidatorService, saasPlanService) {
        this.userRepository = userRepository;
        this.userManagerRepository = userManagerRepository;
        this.companyService = companyService;
        this.passwordValidatorService = passwordValidatorService;
        this.saasPlanService = saasPlanService;
    }
    pickRoleForCreate(userBody) {
        const raw = userBody.role != null ? String(userBody.role) : roles_interface_1.UserRole.RANCH_STAFF;
        const resolved = (0, roles_interface_1.normalizeUserRole)(raw) ?? roles_interface_1.UserRole.RANCH_STAFF;
        if (resolved === roles_interface_1.UserRole.SAAS_OWNER) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Invalid role',
            });
        }
        if (!(0, roles_interface_1.isValidAssignableRole)(resolved)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Invalid role',
            });
        }
        return resolved;
    }
    assertCreateUserRolePolicy(callerRoles, assignedRole) {
        if (callerRoles.includes(roles_interface_1.UserRole.SAAS_OWNER)) {
            return;
        }
        if (callerRoles.includes(roles_interface_1.UserRole.ADMINISTRATOR)) {
            if (assignedRole !== roles_interface_1.UserRole.RANCH_STAFF) {
                throw new apiError_1.default({
                    name: 'Forbidden',
                    statusCode: httpStatusCodes_1.default.FORBIDDEN,
                    description: 'Tenant administrators may only create ranch_staff users',
                });
            }
            return;
        }
        throw new apiError_1.default({
            name: 'Forbidden',
            statusCode: httpStatusCodes_1.default.FORBIDDEN,
            description: 'Insufficient permissions to create users',
        });
    }
    assertUpdateUserRolePolicy(callerRoles, existingRole, nextRole, skipPolicy) {
        if (skipPolicy) {
            return;
        }
        if (!callerRoles?.length) {
            throw new apiError_1.default({
                name: 'InternalError',
                statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
                description: 'User update requires caller roles for role policy',
            });
        }
        if (callerRoles.includes(roles_interface_1.UserRole.SAAS_OWNER)) {
            return;
        }
        if (callerRoles.includes(roles_interface_1.UserRole.ADMINISTRATOR)) {
            if (nextRole === roles_interface_1.UserRole.ADMINISTRATOR && existingRole !== roles_interface_1.UserRole.ADMINISTRATOR) {
                throw new apiError_1.default({
                    name: 'Forbidden',
                    statusCode: httpStatusCodes_1.default.FORBIDDEN,
                    description: 'Tenant administrators cannot grant the company administrator role',
                });
            }
            return;
        }
        throw new apiError_1.default({
            name: 'Forbidden',
            statusCode: httpStatusCodes_1.default.FORBIDDEN,
            description: 'Insufficient permissions to change user roles',
        });
    }
    userRepoUpdateScope(tenantContext) {
        if (tenantContext?.uuid_company === undefined || tenantContext.uuid_company === null) {
            return undefined;
        }
        const uuid_company = String(tenantContext.uuid_company).trim();
        if (uuid_company === '') {
            return undefined;
        }
        return { uuid_company };
    }
    normalizeRoleForUpdate(role, existing) {
        if (role === undefined || role === null || String(role).trim() === '') {
            return existing;
        }
        const resolved = (0, roles_interface_1.normalizeUserRole)(String(role));
        if (!resolved || resolved === roles_interface_1.UserRole.SAAS_OWNER || !(0, roles_interface_1.isValidAssignableRole)(resolved)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Invalid role',
            });
        }
        return resolved;
    }
    async getAll(params) {
        const { rows, count } = await this.userRepository.findAll(params);
        const plainUsers = rows.map(user => user.get({ plain: true }));
        return {
            success: true,
            data: plainUsers,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / params.size),
                currentPage: params.page,
                order: params.order,
                pageSize: params.size
            }
        };
    }
    async create(userBody, callerRolesArg) {
        if (!userBody.password) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Password is required'
            });
        }
        const callerRoles = Array.isArray(callerRolesArg) ? callerRolesArg : [];
        if (!callerRoles.length) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Caller roles are required',
            });
        }
        const companyResponse = await this.companyService.getById({ id: userBody.uuid_company });
        if (!companyResponse.success || !companyResponse.data) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Company does not exist'
            });
        }
        const company = companyResponse.data;
        const activeUsersInCompany = await models_1.UserModel.count({
            where: {
                uuid_company: userBody.uuid_company,
                is_active: true
            }
        });
        const maxUsersAllowed = await this.saasPlanService.getResourceLimit(company.uuid_company, saas_plan_constants_1.SAAS_PLAN_RESOURCE.USERS);
        if (activeUsersInCompany >= maxUsersAllowed) {
            throw new apiError_1.default({
                name: 'PlanLimitReached',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Plan ${company.plan_type} allows only ${maxUsersAllowed} active users`
            });
        }
        this.passwordValidatorService.validate(userBody.password);
        await this.assertUniqueUserFields({
            email: userBody.email,
            username: userBody.username,
            id_card: userBody.id_card,
            uuid_company: userBody.uuid_company
        });
        const hashedPassword = await bcryptjs_1.default.hash(userBody.password, 10);
        const role = this.pickRoleForCreate(userBody);
        this.assertCreateUserRolePolicy(callerRoles, role);
        const user = await this.userRepository.create({
            ...userBody,
            password: hashedPassword,
            role,
        });
        return {
            success: true,
            data: user.get({ plain: true })
        };
    }
    async getById(params) {
        const { id: uuid_user, includeInactive, uuid_company } = params;
        if (!uuid_user) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_user is required'
            });
        }
        const user = await this.userRepository.findById({ id: uuid_user, includeInactive, uuid_company });
        if (!user) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found'
            });
        }
        return {
            success: true,
            data: user.get({ plain: true })
        };
    }
    async update(uuid_user, userBody, tenantContext) {
        if (!uuid_user || uuid_user.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const existingResponse = await this.getById({
            id: uuid_user,
            includeInactive: false,
            uuid_company: tenantContext?.uuid_company
        });
        if (!existingResponse.success || !existingResponse.data) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found'
            });
        }
        const existing = existingResponse.data;
        const merged = {
            email: userBody.email != null ? String(userBody.email) : existing.email,
            username: userBody.username != null ? String(userBody.username) : existing.username,
            id_card: userBody.id_card != null ? String(userBody.id_card) : existing.id_card,
            uuid_company: userBody.uuid_company ?? existing.uuid_company
        };
        await this.assertUniqueUserFields(merged, uuid_user);
        const updateData = { ...userBody };
        const nextRole = this.normalizeRoleForUpdate(userBody.role, existing.role);
        updateData.role = nextRole;
        if (updateData.password !== undefined && updateData.password !== null) {
            const rawPassword = String(updateData.password).trim();
            if (rawPassword === '') {
                updateData.password = undefined;
            }
            else {
                this.passwordValidatorService.validate(rawPassword);
                updateData.password = await bcryptjs_1.default.hash(rawPassword, 10);
            }
        }
        const existingRole = (0, roles_interface_1.normalizeUserRole)(String(existing.role)) ?? roles_interface_1.UserRole.RANCH_STAFF;
        this.assertUpdateUserRolePolicy(tenantContext?.creatorRoles, existingRole, nextRole, tenantContext?.skipRoleAssignmentPolicy === true);
        const updatedUser = await this.userRepository.update(uuid_user, updateData, this.userRepoUpdateScope(tenantContext));
        if (!updatedUser) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found or inactive'
            });
        }
        return {
            success: true,
            data: updatedUser.get({ plain: true })
        };
    }
    async delete(uuid_user, tenantContext) {
        if (!uuid_user || uuid_user.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const requestingUuidUser = tenantContext?.requestingUuidUser?.trim();
        if (requestingUuidUser && requestingUuidUser === uuid_user) {
            throw new apiError_1.default({
                name: 'Forbidden',
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: 'CANNOT_DEACTIVATE_SELF',
            });
        }
        const deleted = await this.userRepository.delete(uuid_user, tenantContext);
        if (!deleted) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found or already inactive'
            });
        }
        return {
            success: true,
            data: null
        };
    }
    async manageUser(uuid_user) {
        if (!uuid_user || uuid_user.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const user = await this.userManagerRepository.manageUser(uuid_user);
        if (!user) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found'
            });
        }
        return {
            success: true,
            data: user.get({ plain: true })
        };
    }
    async getUserByName(username) {
        if (!username || username.trim() === "") {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Username is required'
            });
        }
        const user = await this.userManagerRepository.findUserByName(username);
        if (!user) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'User not found'
            });
        }
        return {
            success: true,
            data: user.get({ plain: true })
        };
    }
    async resetPassword(uuid_user, password) {
        if (!uuid_user || uuid_user.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'User Id required'
            });
        }
        if (!password || password.trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Password is required'
            });
        }
        this.passwordValidatorService.validate(password);
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const passwordReset = await this.userManagerRepository.resetPassword(uuid_user, hashedPassword);
        if (!passwordReset) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Company not found or already inactive'
            });
        }
        return {
            success: true,
            data: null,
        };
    }
    async checkUserFieldAvailability(params) {
        const email = params.email?.trim();
        const username = params.username?.trim();
        const idCard = params.id_card?.trim();
        if (!email && !username && !idCard) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'At least one of email, username, or id_card is required'
            });
        }
        if (idCard && !params.uuid_company) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_company is required when checking id_card'
            });
        }
        const [emailHit, usernameHit, idCardHit] = await Promise.all([
            email ? this.userManagerRepository.findConflictingEmail(email, params.exclude_uuid_user) : Promise.resolve(null),
            username ? this.userManagerRepository.findConflictingUsername(username, params.exclude_uuid_user) : Promise.resolve(null),
            idCard && params.uuid_company
                ? this.userManagerRepository.findConflictingIdCard(idCard, params.uuid_company, params.exclude_uuid_user)
                : Promise.resolve(null)
        ]);
        return {
            success: true,
            data: {
                emailAvailable: email ? !emailHit : true,
                usernameAvailable: username ? !usernameHit : true,
                idCardAvailable: idCard ? !idCardHit : true
            }
        };
    }
    async assertUniqueUserFields(fields, excludeUuid) {
        const [emailHit, usernameHit, idCardHit] = await Promise.all([
            this.userManagerRepository.findConflictingEmail(fields.email, excludeUuid),
            this.userManagerRepository.findConflictingUsername(fields.username, excludeUuid),
            this.userManagerRepository.findConflictingIdCard(fields.id_card, fields.uuid_company, excludeUuid)
        ]);
        if (emailHit) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'EMAIL_IN_USE'
            });
        }
        if (usernameHit) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'USERNAME_IN_USE'
            });
        }
        if (idCardHit) {
            throw new apiError_1.default({
                name: 'Conflict',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'ID_CARD_IN_USE'
            });
        }
    }
}
exports.default = UserService;
