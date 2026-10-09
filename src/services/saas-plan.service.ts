import { ServiceResponse } from '../interfaces/common/service-response.interface';
import { IBaseParams } from '../interfaces/params/query.interface';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import { BillingCycle } from '../constants/domain.constants';
import { resolveCompanyPlanCode, chargeForBillingCycle as periodChargeFromAnnual } from '../constants/subscription.constants';
import { SAAS_PLAN_RESOURCE, SaasPlanResourceCode } from '../constants/saas-plan.constants';
import SaasPlanRepository from '../repositories/saas-plan.repository';
import CompanyRepository from '../repositories/company.repository';
import { CompanyAttributes } from '../interfaces/company/company.interface';
import {
    CompanyPlanSummary,
    SaasPlanLimitValues,
    SaasPlanView,
    SaasPlanWriteBody,
} from '../interfaces/saas-plan/saas-plan.interface';

const PLAN_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

class SaasPlanService {
    private readonly saasPlanRepository: SaasPlanRepository;
    private readonly companyRepository: CompanyRepository;

    constructor(saasPlanRepository: SaasPlanRepository, companyRepository: CompanyRepository) {
        this.saasPlanRepository = saasPlanRepository;
        this.companyRepository = companyRepository;
    }

    async getAll(params: IBaseParams): Promise<ServiceResponse<SaasPlanView[]>> {
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

    async getById(uuidPlan: string): Promise<ServiceResponse<SaasPlanView>> {
        if (!uuidPlan?.trim()) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_plan is required',
            });
        }
        const plan = await this.saasPlanRepository.findById(uuidPlan);
        if (!plan) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Plan not found',
            });
        }
        return { success: true, data: plan };
    }

    async create(body: SaasPlanWriteBody): Promise<ServiceResponse<SaasPlanView>> {
        const code = this.requireCode(body.code);
        const existing = await this.saasPlanRepository.findByCode(code);
        if (existing) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'Plan code already exists',
            });
        }

        const created = await this.saasPlanRepository.create(
            {
                code,
                name: this.requireName(body.name),
                description: this.normalizeDescription(body.description),
                annual_price: this.requirePrice(body.annual_price),
                currency: this.requireCurrency(body.currency ?? 'USD'),
                is_active: this.requireActiveFlag(body.is_active, true),
            },
            this.requireLimitRows(body)
        );

        return { success: true, data: created };
    }

    async update(uuidPlan: string, body: SaasPlanWriteBody): Promise<ServiceResponse<SaasPlanView>> {
        const current = await this.saasPlanRepository.findById(uuidPlan);
        if (!current) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Plan not found',
            });
        }

        const updated = await this.saasPlanRepository.update(
            uuidPlan,
            {
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
            },
            this.requireLimitRows(body, current)
        );

        if (!updated) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Plan not found',
            });
        }

        return { success: true, data: updated };
    }

    /**
     * Limits of a plan at this moment. Stored on the subscription so later catalog edits do not apply until renewal.
     */
    async subscriptionLimitsForPlan(planCode: string): Promise<{
        max_users: number;
        max_animals: number;
        max_activity_records: number;
    }> {
        const code = resolveCompanyPlanCode(planCode);
        const plan = code ? await this.saasPlanRepository.findByCode(code) : null;
        const maxUsers = plan?.limits.USERS;
        const maxAnimals = plan?.limits.ANIMALS;
        const maxActivityRecords = plan?.limits.ACTIVITY_RECORDS;
        if (maxUsers == null || maxAnimals == null || maxActivityRecords == null) {
            throw new ApiError({
                name: 'PlanLimitNotConfigured',
                statusCode: HttpStatusCodes.BAD_REQUEST,
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
    async getResourceLimit(uuidCompany: string, resourceCode: SaasPlanResourceCode): Promise<number> {
        const company = await this.companyRepository.findById({
            id: uuidCompany,
            includeInactive: true,
        });
        if (!company) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found',
            });
        }

        const lockedLimit = this.lockedSubscriptionLimit(company, resourceCode);
        if (lockedLimit != null) {
            return lockedLimit;
        }

        const code = resolveCompanyPlanCode(company.plan_type);
        const maxValue = await this.saasPlanRepository.findLimitValue(code, resourceCode);
        if (maxValue == null) {
            throw new ApiError({
                name: 'PlanLimitNotConfigured',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `Plan limit ${resourceCode} is not configured for plan ${code}`,
            });
        }
        return maxValue;
    }

    /** Active catalog plan that can be assigned on a new activation payment. */
    async requireAssignablePlan(planCode: string): Promise<SaasPlanView> {
        const code = resolveCompanyPlanCode(planCode);
        if (!code) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Valid plan_type is required',
            });
        }
        const plan = await this.saasPlanRepository.findByCode(code);
        if (!plan || !plan.is_active) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Valid plan_type is required',
            });
        }
        return plan;
    }

    chargeForBillingCycle(annualPrice: number, billingCycle: BillingCycle): number {
        return periodChargeFromAnnual(annualPrice, billingCycle);
    }

    async findSummariesByCodes(planCodes: string[]): Promise<Map<string, CompanyPlanSummary>> {
        const resolved = [...new Set(planCodes.map((code) => resolveCompanyPlanCode(code)).filter((code) => code.length > 0))];
        const plans = await this.saasPlanRepository.findByCodes(resolved);
        const summaries = new Map<string, CompanyPlanSummary>();
        for (const plan of plans) {
            summaries.set(plan.code, this.toSummary(plan));
        }
        return summaries;
    }

    summaryForCode(planCode: string, summaries: Map<string, CompanyPlanSummary>): CompanyPlanSummary | null {
        return summaries.get(resolveCompanyPlanCode(planCode)) ?? null;
    }

    /** Limits the company is operating under, when a subscription already locked them. */
    lockedPlanLimits(company: CompanyAttributes): SaasPlanLimitValues | null {
        if (company.max_users == null || company.max_animals == null || company.max_activity_records == null) {
            return null;
        }
        return {
            USERS: Number(company.max_users),
            ANIMALS: Number(company.max_animals),
            ACTIVITY_RECORDS: Number(company.max_activity_records),
        };
    }

    private lockedSubscriptionLimit(company: CompanyAttributes, resourceCode: SaasPlanResourceCode): number | null {
        const locked = this.lockedPlanLimits(company);
        if (!locked) {
            return null;
        }
        const value = locked[resourceCode];
        return value == null ? null : Number(value);
    }

    private toSummary(plan: SaasPlanView): CompanyPlanSummary {
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

    private requireCode(raw: string | undefined): string {
        const code = String(raw ?? '').trim().toUpperCase();
        if (!PLAN_CODE_PATTERN.test(code)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Plan code must use uppercase letters, digits, and underscores',
            });
        }
        return code;
    }

    private requireName(raw: string | undefined): string {
        const name = String(raw ?? '').trim();
        if (!name || name.length > 160) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Plan name is required',
            });
        }
        return name;
    }

    private normalizeDescription(raw: string | null | undefined): string | null {
        if (raw === undefined || raw === null) {
            return null;
        }
        const description = String(raw).trim();
        return description.length > 0 ? description : null;
    }

    private requirePrice(raw: number | undefined): number {
        const price = Number(raw);
        if (!Number.isFinite(price) || price < 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Annual price must be a number greater than or equal to 0',
            });
        }
        return Number(price.toFixed(2));
    }

    private requireCurrency(raw: string): string {
        const currency = String(raw ?? '').trim().toUpperCase();
        if (!CURRENCY_PATTERN.test(currency)) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Currency must be a 3-letter code',
            });
        }
        return currency;
    }

    private requireActiveFlag(raw: boolean | undefined, fallback: boolean): boolean {
        if (raw === undefined || raw === null) {
            return fallback;
        }
        if (typeof raw !== 'boolean') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'is_active must be a boolean',
            });
        }
        return raw;
    }

    private requireLimitRows(
        body: SaasPlanWriteBody,
        current?: SaasPlanView
    ): Array<{ resource_code: string; max_value: number }> {
        return [
            {
                resource_code: SAAS_PLAN_RESOURCE.USERS,
                max_value: this.requireLimit(body.max_users, current?.limits.USERS, 'max_users'),
            },
            {
                resource_code: SAAS_PLAN_RESOURCE.ANIMALS,
                max_value: this.requireLimit(body.max_animals, current?.limits.ANIMALS, 'max_animals'),
            },
            {
                resource_code: SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS,
                max_value: this.requireLimit(
                    body.max_activity_records,
                    current?.limits.ACTIVITY_RECORDS,
                    'max_activity_records'
                ),
            },
        ];
    }

    private requireLimit(raw: number | undefined, current: number | null | undefined, field: string): number {
        const source = raw === undefined ? current : raw;
        const value = Number(source);
        if (!Number.isInteger(value) || value < 0) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: `${field} must be an integer greater than or equal to 0`,
            });
        }
        return value;
    }
}

export default SaasPlanService;
