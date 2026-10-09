"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
const models_1 = require("../database/models");
const domain_constants_1 = require("../constants/domain.constants");
class CompanyPaymentService {
    constructor(companyPaymentRepository, companyService, saasPlanService) {
        this.companyPaymentRepository = companyPaymentRepository;
        this.companyService = companyService;
        this.saasPlanService = saasPlanService;
    }
    calculateNextRenewalDate(fromDate, billingCycle) {
        const renewalDate = new Date(fromDate);
        if (billingCycle === 'ANNUAL') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }
        else {
            renewalDate.setMonth(renewalDate.getMonth() + 6);
        }
        return renewalDate;
    }
    parseDateField(rawDate, fieldName) {
        const parsed = new Date(String(rawDate));
        if (Number.isNaN(parsed.getTime())) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: `${fieldName} must be a valid date`
            });
        }
        return parsed;
    }
    roundMoney(value) {
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }
    roundExchangeRate(value) {
        return Math.round((value + Number.EPSILON) * 1000000) / 1000000;
    }
    async validateAndNormalizeActivationPayment(body) {
        const plan = await this.saasPlanService.requireAssignablePlan(body.plan_type);
        if (!body.billing_cycle || !domain_constants_1.BILLING_CYCLES.includes(body.billing_cycle)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Valid billing_cycle is required'
            });
        }
        if (!body.payment_method || !domain_constants_1.PAYMENT_METHODS.includes(body.payment_method)) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Valid payment_method is required'
            });
        }
        const calculatedAmount = this.saasPlanService.chargeForBillingCycle(plan.annual_price, body.billing_cycle);
        const amount = body.amount !== undefined && body.amount !== null
            ? Number(body.amount)
            : calculatedAmount;
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'amount must be a positive number'
            });
        }
        const exchangeRateRaw = Number(body.exchange_rate);
        if (!Number.isFinite(exchangeRateRaw) || exchangeRateRaw <= 0) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'exchange_rate must be a positive number (BOB per 1 USD)'
            });
        }
        const exchangeRate = this.roundExchangeRate(exchangeRateRaw);
        const amountBob = this.roundMoney(amount * exchangeRate);
        if (body.paid_at === undefined || body.paid_at === null || String(body.paid_at).trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'paid_at is required'
            });
        }
        if (body.period_start === undefined || body.period_start === null || String(body.period_start).trim() === '') {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'period_start (activation start date) is required'
            });
        }
        const paidAt = this.parseDateField(body.paid_at, 'paid_at');
        const periodStart = this.parseDateField(body.period_start, 'period_start');
        const paymentReference = body.payment_reference !== undefined && body.payment_reference !== null
            ? String(body.payment_reference).trim()
            : '';
        const notes = body.notes !== undefined && body.notes !== null
            ? String(body.notes).trim()
            : '';
        return {
            amount,
            paidAt,
            periodStart,
            paymentReference: paymentReference.length > 0 ? paymentReference : null,
            notes: notes.length > 0 ? notes : null,
            planCode: plan.code,
            currency: plan.currency,
            exchangeRate,
            amountBob
        };
    }
    async getAll(params) {
        const { rows, count } = await this.companyPaymentRepository.findAll(params);
        const plainRows = rows.map((row) => row.get({ plain: true }));
        return {
            success: true,
            data: plainRows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / params.size),
                currentPage: params.page,
                order: params.order,
                pageSize: params.size
            }
        };
    }
    async create(body, _options) {
        if (!body.uuid_company) {
            throw new apiError_1.default({
                name: 'ValidationError',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'uuid_company is required'
            });
        }
        const companyResponse = await this.companyService.getById({ id: body.uuid_company, includeInactive: true });
        const companyState = companyResponse.data;
        const renewalAt = companyState.membership_renewal_at ? new Date(companyState.membership_renewal_at) : null;
        const hasActivePaidSubscription = companyState.membership_status === 'ACTIVE'
            && !!renewalAt
            && renewalAt.getTime() >= Date.now();
        if (hasActivePaidSubscription) {
            throw new apiError_1.default({
                name: 'SubscriptionAlreadyActive',
                statusCode: httpStatusCodes_1.default.BAD_REQUEST,
                description: 'Company already has an active paid subscription'
            });
        }
        const normalized = await this.validateAndNormalizeActivationPayment(body);
        const limits = await this.saasPlanService.subscriptionLimitsForPlan(normalized.planCode);
        const payload = {
            ...body,
            plan_type: normalized.planCode,
            amount: normalized.amount,
            currency: normalized.currency,
            exchange_rate: normalized.exchangeRate,
            amount_bob: normalized.amountBob,
            max_users: limits.max_users,
            max_animals: limits.max_animals,
            max_activity_records: limits.max_activity_records,
            paid_at: normalized.paidAt,
            period_start: normalized.periodStart,
            payment_reference: normalized.paymentReference,
            notes: normalized.notes
        };
        const created = await this.companyPaymentRepository.create(payload);
        const company = await models_1.CompanyModel.findOne({
            where: {
                uuid_company: body.uuid_company
            }
        });
        if (company) {
            const currentRenewal = company.membership_renewal_at ? new Date(company.membership_renewal_at) : null;
            const baseDate = currentRenewal && currentRenewal > normalized.periodStart ? currentRenewal : normalized.periodStart;
            const nextRenewal = this.calculateNextRenewalDate(baseDate, body.billing_cycle);
            company.plan_type = normalized.planCode;
            company.billing_cycle = body.billing_cycle;
            company.membership_status = 'ACTIVE';
            company.is_active = true;
            company.membership_started_at = normalized.periodStart;
            company.membership_renewal_at = nextRenewal;
            company.max_users = limits.max_users;
            company.max_animals = limits.max_animals;
            company.max_activity_records = limits.max_activity_records;
            await company.save();
            created.period_end = nextRenewal;
            await created.save();
        }
        return {
            success: true,
            data: created.get({ plain: true })
        };
    }
    async getById(params) {
        const row = await this.companyPaymentRepository.findById(params);
        if (!row) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Company payment not found'
            });
        }
        return {
            success: true,
            data: row.get({ plain: true })
        };
    }
    async update(id, body, tenantContext) {
        const updated = await this.companyPaymentRepository.update(id, body, tenantContext);
        if (!updated) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Company payment not found or inactive'
            });
        }
        return {
            success: true,
            data: updated.get({ plain: true })
        };
    }
    async delete(id, tenantContext) {
        const deleted = await this.companyPaymentRepository.delete(id, tenantContext);
        if (!deleted) {
            throw new apiError_1.default({
                name: 'NotFound',
                statusCode: httpStatusCodes_1.default.NOT_FOUND,
                description: 'Company payment not found or inactive'
            });
        }
        return {
            success: true,
            data: null
        };
    }
}
exports.default = CompanyPaymentService;
