"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const subscription_constants_1 = require("../constants/subscription.constants");
const saas_plan_constants_1 = require("../constants/saas-plan.constants");
const PLAN_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
class SaasPlanService {
    constructor(saasPlanRepository, companyRepository) {
        this.saasPlanRepository = saasPlanRepository;
        this.companyRepository = companyRepository;
    }
    async getAll(params) {
        const { rows, count } = await this.saasPlanRepository.findAll(params);
        return {
            success: true,
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / params.size),
                currentPage: params.page,
                order: params.order,
                pageSize: params.size,
            },
        };
    }
    async getById(uuidPlan) {
        if (!uuidPlan?.trim()) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_plan is required',
            });
        }
        const plan = await this.saasPlanRepository.findById(uuidPlan);
        if (!plan) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Plan not found',
            });
        }
        return { success: true, data: plan };
    }
    async create(body) {
        const code = this.requireCode(body.code);
        const existing = await this.saasPlanRepository.findByCode(code);
        if (existing) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.CONFLICT,
                description: 'Plan code already exists',
            });
        }
        const created = await this.saasPlanRepository.create({
            code,
            name: this.requireName(body.name),
            description: this.normalizeDescription(body.description),
            annual_price: this.requirePrice(body.annual_price),
            currency: this.requireCurrency(body.currency ?? 'USD'),
            is_active: this.requireActiveFlag(body.is_active, true),
        }, this.requireLimitRows(body));
        return { success: true, data: created };
    }
    async update(uuidPlan, body) {
        const current = await this.saasPlanRepository.findById(uuidPlan);
        if (!current) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Plan not found',
            });
        }
        const updated = await this.saasPlanRepository.update(uuidPlan, {
            name: body.name === undefined ? current.name : this.requireName(body.name),
            description: body.description === undefined
                ? current.description
                : this.normalizeDescription(body.description),
            annual_price: body.annual_price === undefined
                ? current.annual_price
                : this.requirePrice(body.annual_price),
            currency: body.currency === undefined
                ? current.currency
                : this.requireCurrency(body.currency),
            is_active: body.is_active === undefined
                ? current.is_active
                : this.requireActiveFlag(body.is_active, current.is_active),
        }, this.requireLimitRows(body, current));
        if (!updated) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Plan not found',
            });
        }
        return { success: true, data: updated };
    }
    /**
     * Limits of a plan at this moment. Stored on the subscription so later catalog edits do not apply until renewal.
     */
    async subscriptionLimitsForPlan(planCode) {
        const code = (0, subscription_constants_1.resolveCompanyPlanCode)(planCode);
        const plan = code ? await this.saasPlanRepository.findByCode(code) : null;
        const maxUsers = plan?.limits.USERS;
        const maxAnimals = plan?.limits.ANIMALS;
        const maxActivityRecords = plan?.limits.ACTIVITY_RECORDS;
        if (maxUsers == null || maxAnimals == null || maxActivityRecords == null) {
            throw new apiError_1.default({
                name: 'PlanLimitNotConfigured',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Plan limits are not configured for plan ${code || planCode}`,
            });
        }
        return {
            max_users: Number(maxUsers),
            max_animals: Number(maxAnimals),
            max_activity_records: Number(maxActivityRecords),
        };
    }
    /**
     * Limit locked on the company's current subscription.
     * Companies without a subscription yet use the live catalog.
     * Inactive plans still apply to companies that already use them.
     */
    async getResourceLimit(uuidCompany, resourceCode) {
        const company = await this.companyRepository.findById({
            id: uuidCompany,
            includeInactive: true,
        });
        if (!company) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Company not found',
            });
        }
        const lockedLimit = this.lockedSubscriptionLimit(company, resourceCode);
        if (lockedLimit != null) {
            return lockedLimit;
        }
        const code = (0, subscription_constants_1.resolveCompanyPlanCode)(company.plan_type);
        const maxValue = await this.saasPlanRepository.findLimitValue(code, resourceCode);
        if (maxValue == null) {
            throw new apiError_1.default({
                name: 'PlanLimitNotConfigured',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `Plan limit ${resourceCode} is not configured for plan ${code}`,
            });
        }
        return maxValue;
    }
    /** Active catalog plan that can be assigned on a new activation payment. */
    async requireAssignablePlan(planCode) {
        const code = (0, subscription_constants_1.resolveCompanyPlanCode)(planCode);
        if (!code) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Valid plan_type is required',
            });
        }
        const plan = await this.saasPlanRepository.findByCode(code);
        if (!plan || !plan.is_active) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Valid plan_type is required',
            });
        }
        return plan;
    }
    chargeForBillingCycle(annualPrice, billingCycle) {
        return (0, subscription_constants_1.chargeForBillingCycle)(annualPrice, billingCycle);
    }
    async findSummariesByCodes(planCodes) {
        const resolved = [...new Set(planCodes.map((code) => (0, subscription_constants_1.resolveCompanyPlanCode)(code)).filter((code) => code.length > 0))];
        const plans = await this.saasPlanRepository.findByCodes(resolved);
        const summaries = new Map();
        for (const plan of plans) {
            summaries.set(plan.code, this.toSummary(plan));
        }
        return summaries;
    }
    summaryForCode(planCode, summaries) {
        return summaries.get((0, subscription_constants_1.resolveCompanyPlanCode)(planCode)) ?? null;
    }
    /** Limits the company is operating under, when a subscription already locked them. */
    lockedPlanLimits(company) {
        if (company.max_users == null || company.max_animals == null || company.max_activity_records == null) {
            return null;
        }
        return {
            USERS: Number(company.max_users),
            ANIMALS: Number(company.max_animals),
            ACTIVITY_RECORDS: Number(company.max_activity_records),
        };
    }
    lockedSubscriptionLimit(company, resourceCode) {
        const locked = this.lockedPlanLimits(company);
        if (!locked) {
            return null;
        }
        const value = locked[resourceCode];
        return value == null ? null : Number(value);
    }
    toSummary(plan) {
        return {
            uuid_plan: plan.uuid_plan,
            code: plan.code,
            name: plan.name,
            description: plan.description,
            annual_price: plan.annual_price,
            currency: plan.currency,
            is_active: plan.is_active,
            limits: plan.limits,
        };
    }
    requireCode(raw) {
        const code = String(raw ?? '').trim().toUpperCase();
        if (!PLAN_CODE_PATTERN.test(code)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Plan code must use uppercase letters, digits, and underscores',
            });
        }
        return code;
    }
    requireName(raw) {
        const name = String(raw ?? '').trim();
        if (!name || name.length > 160) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Plan name is required',
            });
        }
        return name;
    }
    normalizeDescription(raw) {
        if (raw === undefined || raw === null) {
            return null;
        }
        const description = String(raw).trim();
        return description.length > 0 ? description : null;
    }
    requirePrice(raw) {
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Annual price must be a number greater than or equal to 0',
            });
        }
        return Number(price.toFixed(2));
    }
    requireCurrency(raw) {
        const currency = String(raw ?? '').trim().toUpperCase();
        if (!CURRENCY_PATTERN.test(currency)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Currency must be a 3-letter code',
            });
        }
        return currency;
    }
    requireActiveFlag(raw, fallback) {
        if (raw === undefined || raw === null) {
            return fallback;
        }
        if (typeof raw !== 'boolean') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'is_active must be a boolean',
            });
        }
        return raw;
    }
    requireLimitRows(body, current) {
        return [
            {
                resource_code: saas_plan_constants_1.SAAS_PLAN_RESOURCE.USERS,
                max_value: this.requireLimit(body.max_users, current?.limits.USERS, 'max_users'),
            },
            {
                resource_code: saas_plan_constants_1.SAAS_PLAN_RESOURCE.ANIMALS,
                max_value: this.requireLimit(body.max_animals, current?.limits.ANIMALS, 'max_animals'),
            },
            {
                resource_code: saas_plan_constants_1.SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS,
                max_value: this.requireLimit(body.max_activity_records, current?.limits.ACTIVITY_RECORDS, 'max_activity_records'),
            },
        ];
    }
    requireLimit(raw, current, field) {
        const source = raw === undefined ? current : raw;
        const value = Number(source);
        if (!Number.isInteger(value) || value < 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${field} must be an integer greater than or equal to 0`,
            });
        }
        return value;
    }
}
exports.default = SaasPlanService;
