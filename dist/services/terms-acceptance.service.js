"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.termsAccessUnavailable = termsAccessUnavailable;
const sequelize_1 = require("sequelize");
const terms_constants_1 = require("../constants/terms.constants");
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const membership_access_helper_1 = require("../helpers/membership-access.helper");
function termsAccessUnavailable() {
    return {
        access_granted: false,
        acceptance_required: true,
        accepted: false,
        block_reason: 'terms_unavailable',
        current_version: null,
    };
}
function toSummary(version) {
    return {
        uuid_terms_version: version.uuid_terms_version,
        version: version.version,
        title: version.title,
        effective_at: version.effective_at,
        updated_at: version.updated_at ?? version.created_at ?? version.effective_at,
        is_active: version.is_active,
        requires_acceptance: version.requires_acceptance,
    };
}
function clip(value, maxLength) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    return trimmed.slice(0, maxLength);
}
function isUniqueViolation(error) {
    return error instanceof sequelize_1.UniqueConstraintError
        || (typeof error === 'object'
            && error !== null
            && error.name === 'SequelizeUniqueConstraintError');
}
/**
 * Terms acceptance is decided here from persisted versions and acceptances.
 * Callers must pass the authenticated user and organization. Client flags are ignored.
 *
 * Publishing a new obligatory version is an administrative action: create the row and
 * mark it active. Users without an acceptance row for that version stay blocked.
 * Previous acceptance rows are never updated or deleted.
 */
class TermsAcceptanceService {
    constructor(repository) {
        this.repository = repository;
    }
    async evaluateAccess(uuidUser, uuidCompany, now = new Date()) {
        if (!uuidUser?.trim() || !uuidCompany?.trim()) {
            return this.denied('organization_missing', false, null);
        }
        const company = await this.repository.findCompany(uuidCompany);
        if (!company) {
            return this.denied('organization_missing', false, null);
        }
        if (!(0, membership_access_helper_1.hasValidMembership)(company, now.getTime())) {
            return this.denied('membership_invalid', false, null);
        }
        const current = await this.repository.findCurrentRequiredVersion(now);
        if (!current) {
            return {
                access_granted: true,
                acceptance_required: false,
                accepted: false,
                block_reason: 'none',
                current_version: null,
            };
        }
        const acceptance = await this.repository.findAcceptance(uuidUser, uuidCompany, current.uuid_terms_version);
        if (!acceptance) {
            return {
                access_granted: false,
                acceptance_required: true,
                accepted: false,
                block_reason: 'acceptance_required',
                current_version: toSummary(current),
            };
        }
        return {
            access_granted: true,
            acceptance_required: true,
            accepted: true,
            block_reason: 'none',
            current_version: toSummary(current),
        };
    }
    async getCurrentDocument(uuidUser, uuidCompany, now = new Date()) {
        const decision = await this.evaluateAccess(uuidUser, uuidCompany, now);
        this.assertOrganizationCanReadTerms(decision.block_reason);
        const current = await this.repository.findCurrentRequiredVersion(now);
        if (!current) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'No terms version currently requires acceptance',
            });
        }
        return current;
    }
    async accept(command, now = new Date()) {
        if (command.accepted !== true) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Explicit acceptance is required',
            });
        }
        const uuidTermsVersion = command.uuid_terms_version?.trim();
        if (!uuidTermsVersion) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_terms_version is required',
            });
        }
        const decision = await this.evaluateAccess(command.uuid_user, command.uuid_company, now);
        this.assertOrganizationCanReadTerms(decision.block_reason);
        const current = await this.repository.findCurrentRequiredVersion(now);
        if (!current) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'No terms version currently requires acceptance',
            });
        }
        if (current.uuid_terms_version !== uuidTermsVersion) {
            throw new apiError_1.default({
                name: 'ConflictError',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'The submitted terms version is not the required version',
            });
        }
        const existing = await this.repository.findAcceptance(command.uuid_user, command.uuid_company, current.uuid_terms_version);
        if (existing) {
            const access = await this.evaluateAccess(command.uuid_user, command.uuid_company, now);
            return {
                success: true,
                data: {
                    acceptance: existing,
                    already_recorded: true,
                    access,
                },
            };
        }
        try {
            const created = await this.repository.createAcceptance({
                uuid_user: command.uuid_user,
                uuid_company: command.uuid_company,
                uuid_terms_version: current.uuid_terms_version,
                accepted_at: now,
                ip_address: clip(command.ip_address, terms_constants_1.TERMS_IP_MAX_LENGTH),
                user_agent: clip(command.user_agent, terms_constants_1.TERMS_USER_AGENT_MAX_LENGTH),
            });
            const access = await this.evaluateAccess(command.uuid_user, command.uuid_company, now);
            return {
                success: true,
                data: {
                    acceptance: created,
                    already_recorded: false,
                    access,
                },
            };
        }
        catch (error) {
            if (!isUniqueViolation(error)) {
                throw error;
            }
            const raced = await this.repository.findAcceptance(command.uuid_user, command.uuid_company, current.uuid_terms_version);
            if (!raced) {
                throw error;
            }
            const access = await this.evaluateAccess(command.uuid_user, command.uuid_company, now);
            return {
                success: true,
                data: {
                    acceptance: raced,
                    already_recorded: true,
                    access,
                },
            };
        }
    }
    async listVersions() {
        const versions = await this.repository.listVersions();
        return { success: true, data: versions };
    }
    async findVersionByCode(version) {
        return this.repository.findVersionByCode(version);
    }
    async createVersion(body) {
        const version = this.requireVersionCode(body.version);
        const existing = await this.repository.findVersionByCode(version);
        if (existing) {
            throw new apiError_1.default({
                name: 'ConflictError',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Terms version already exists',
            });
        }
        const created = await this.repository.insertVersion({
            version,
            title: this.requireTitle(body.title),
            content: this.requireContent(body.content),
            effective_at: this.requireEffectiveAt(body.effective_at),
            requires_acceptance: body.requires_acceptance !== false,
            is_active: false,
        }, body.publish === true);
        return { success: true, data: created };
    }
    async publishVersion(uuidTermsVersion) {
        if (!uuidTermsVersion?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_terms_version is required',
            });
        }
        const current = await this.repository.findVersionById(uuidTermsVersion);
        if (!current) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Terms version not found',
            });
        }
        const published = await this.repository.activateVersion(uuidTermsVersion);
        if (!published) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Terms version not found',
            });
        }
        return { success: true, data: published };
    }
    denied(blockReason, acceptanceRequired, currentVersion) {
        return {
            access_granted: false,
            acceptance_required: acceptanceRequired,
            accepted: false,
            block_reason: blockReason,
            current_version: currentVersion,
        };
    }
    assertOrganizationCanReadTerms(blockReason) {
        if (blockReason === 'organization_missing' || blockReason === 'membership_invalid') {
            throw new apiError_1.default({
                name: 'OrganizationMembershipRequired',
                statusCode: httpStatusCodes_1.default.FORBIDDEN,
                description: blockReason === 'organization_missing'
                    ? 'User is not associated with an organization'
                    : 'Organization does not have a valid membership',
            });
        }
    }
    requireVersionCode(version) {
        const normalized = version?.trim() ?? '';
        if (!terms_constants_1.TERMS_VERSION_CODE_PATTERN.test(normalized)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Terms version must use a numeric version such as 1.0 or 1.1.0',
            });
        }
        return normalized;
    }
    requireTitle(title) {
        const normalized = title?.trim() ?? '';
        if (normalized.length < 3 || normalized.length > 200) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Terms title is required',
            });
        }
        return normalized;
    }
    requireContent(content) {
        const normalized = content?.trim() ?? '';
        if (normalized.length < terms_constants_1.TERMS_CONTENT_MIN_LENGTH || normalized.length > terms_constants_1.TERMS_CONTENT_MAX_LENGTH) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Terms content is required',
            });
        }
        return normalized;
    }
    requireEffectiveAt(value) {
        if (!value?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'effective_at is required',
            });
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'effective_at is invalid',
            });
        }
        return parsed;
    }
}
exports.default = TermsAcceptanceService;
