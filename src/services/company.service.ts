import { CompanyAttributes, CompanyCreationAttributes } from "../interfaces/company/company.interface";
import { ServiceResponse } from "../interfaces/common/service-response.interface";
import { IBaseServiceInterface } from "../interfaces/services/base-service.interface";
import { IBaseRepository } from "../interfaces/repositories/base-repository.interface";
import CompanyRepository from "../repositories/company.repository";
import {IBaseParams} from "../interfaces/params/query.interface";
import CompanyPaymentModel from "../database/models/company-payment.model";
import { CompanyPaymentCreationAttributes } from "../interfaces/company/company-payment.interface";
import ApiError from "../errors/apiError";
import HttpStatusCodes from "../errors/httpStatusCodes";
import { ITenantProvisioningService } from "../interfaces/services/tenant-provisioning-service.interface";
import { attachOperationalTenantToCompany } from "../helpers/company-operational-tenant.helper";
import { CompanyFieldAvailabilityResult } from "../interfaces/company/company-availability.interface";
import SaasPlanService from "./saas-plan.service";

class CompanyService implements IBaseServiceInterface<CompanyAttributes, CompanyCreationAttributes> {

    private readonly companyRepository: CompanyRepository;
    private readonly companyPaymentRepository: IBaseRepository<CompanyPaymentModel, CompanyPaymentCreationAttributes>;
    private readonly tenantProvisioningService: ITenantProvisioningService;
    private readonly saasPlanService: SaasPlanService;

    constructor(
        companyRepository: CompanyRepository,
        companyPaymentRepository: IBaseRepository<CompanyPaymentModel, CompanyPaymentCreationAttributes>,
        tenantProvisioningService: ITenantProvisioningService,
        saasPlanService: SaasPlanService,
    ) {
        this.companyRepository = companyRepository;
        this.companyPaymentRepository = companyPaymentRepository;
        this.tenantProvisioningService = tenantProvisioningService;
        this.saasPlanService = saasPlanService;
    }

    async getAll(params: IBaseParams): Promise<ServiceResponse<CompanyAttributes[]>> {

        const {rows, count} = await this.companyRepository.findAll(params);

        const plainCompanies = rows.map(company => company.get({plain: true}));

        return {
            success: true,
            data: await this.withAssignedPlans(plainCompanies),
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / params.size),
                currentPage: params.page,
                order: params.order,
                pageSize: params.size
            }
        };
    }

    async create(companyBody: CompanyCreationAttributes, _options?: unknown): Promise<ServiceResponse<CompanyAttributes>> {
        const payload = this.buildCompanyCreatePayload(companyBody);
        await this.assertUniqueCompanyFields({
            name: payload.name,
            tax_id: payload.tax_id ?? null,
        });
        const company = await this.companyRepository.create(payload);
        const uuid_company = company.uuid_company;

        await attachOperationalTenantToCompany(
            uuid_company,
            this.tenantProvisioningService,
            this.companyRepository
        );

        const refreshed = await this.companyRepository.findById({
            id: uuid_company,
            includeInactive: true,
        });
        if (!refreshed) {
            throw new ApiError({
                name: 'InternalError',
                statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
                description: 'Company not found after tenant provisioning',
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(refreshed.get({ plain: true }))
        };
    }

    async getById(params: { id: string, includeInactive?: boolean, uuid_company?: string}): Promise<ServiceResponse<CompanyAttributes>> {
        const { id: uuid_company, includeInactive, uuid_company: tenantCompany } = params;

        if (!uuid_company || uuid_company.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_company is required'
            });
        }

        const company = await this.companyRepository.findById({ id:uuid_company, includeInactive, uuid_company: tenantCompany });

        if (!company) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found'
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(company.get({ plain: true }))
        };
    }

    async update(
        uuid_company: string,
        companyBody: CompanyCreationAttributes,
        tenantContext?: { uuid_company?: string }
    ): Promise<ServiceResponse<CompanyAttributes>> {
        if (!uuid_company || uuid_company.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company Name is required'
            });
        }

        const currentCompany = await this.companyRepository.findById({
            id: uuid_company,
            uuid_company: tenantContext?.uuid_company
        });

        if (!currentCompany) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or inactive'
            });
        }

        const current = currentCompany.get({ plain: true });
        const payload = this.buildCompanyPayload(companyBody, current);
        const effectiveName = payload.name != null ? String(payload.name).trim() : current.name;
        const effectiveTaxId = payload.tax_id !== undefined
            ? this.normalizeOptionalString(payload.tax_id)
            : (current.tax_id ?? null);

        await this.assertUniqueCompanyFields(
            { name: effectiveName, tax_id: effectiveTaxId },
            uuid_company
        );

        const updatedCompany = await this.companyRepository.update(uuid_company, payload, tenantContext);

        if (!updatedCompany) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or inactive'
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(updatedCompany.get({ plain: true }))
        };
    }

    async delete(uuid_company: string, tenantContext?: { uuid_company?: string }): Promise<ServiceResponse<null>> {
        if (!uuid_company || uuid_company.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company Name is required'
            });
        }

        const deleted = await this.companyRepository.delete(uuid_company, tenantContext);

        if (!deleted) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or already inactive'
            });
        }

        return {
            success: true,
            data: null
        };
    }

    async reactivate(
        uuid_company: string,
        tenantContext?: { uuid_company?: string }
    ): Promise<ServiceResponse<CompanyAttributes>> {
        if (!uuid_company || uuid_company.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_company is required'
            });
        }

        const reactivated = await this.companyRepository.reactivate(uuid_company, tenantContext);

        if (!reactivated) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or already active'
            });
        }

        const row = await this.companyRepository.findById({
            id: uuid_company,
            includeInactive: true,
            uuid_company: tenantContext?.uuid_company
        });

        if (!row) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found after reactivate'
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(row.get({ plain: true }))
        };
    }

    async endSubscription(
        uuid_company: string,
        tenantContext?: { uuid_company?: string }
    ): Promise<ServiceResponse<CompanyAttributes>> {
        if (!uuid_company || uuid_company.trim() === '') {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'uuid_company is required'
            });
        }

        const currentCompany = await this.companyRepository.findById({
            id: uuid_company,
            includeInactive: true,
            uuid_company: tenantContext?.uuid_company
        });

        if (!currentCompany) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found'
            });
        }

        const plain = currentCompany.get({ plain: true });
        if (!plain.is_active) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company is archived'
            });
        }

        const updated = await this.companyRepository.updateMembershipState(
            uuid_company,
            {
                membership_status: 'CANCELLED',
                membership_renewal_at: null
            },
            tenantContext
        );

        if (!updated) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company could not be updated'
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(updated.get({ plain: true }))
        };
    }

    async activateTrial(
        uuid_company: string,
        trialStartDate: string,
        trialEndDate: string,
        tenantContext?: { uuid_company?: string }
    ): Promise<ServiceResponse<CompanyAttributes>> {
        if (!trialStartDate || !trialEndDate) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Trial start and end dates are required'
            });
        }

        const startDate = new Date(trialStartDate);
        const endDate = new Date(trialEndDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Invalid trial dates'
            });
        }

        if (startDate >= endDate) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Trial end date must be after start date'
            });
        }

        const currentCompany = await this.companyRepository.findById({
            id: uuid_company,
            uuid_company: tenantContext?.uuid_company
        });
        if (!currentCompany) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or inactive'
            });
        }

        const currentRenewalAt = currentCompany.membership_renewal_at ? new Date(currentCompany.membership_renewal_at) : null;
        const hasActivePaidSubscription = currentCompany.membership_status === 'ACTIVE'
            && !!currentRenewalAt
            && currentRenewalAt.getTime() >= Date.now();
        if (hasActivePaidSubscription) {
            throw new ApiError({
                name: 'SubscriptionAlreadyActive',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company already has an active paid subscription'
            });
        }

        const hasActiveTrial = currentCompany.membership_status === 'TRIAL'
            && !!currentRenewalAt
            && currentRenewalAt.getTime() >= Date.now();
        if (hasActiveTrial) {
            throw new ApiError({
                name: 'TrialAlreadyActive',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company already has an active trial'
            });
        }

        const payload: Partial<CompanyCreationAttributes> = {
            membership_status: 'TRIAL',
            membership_started_at: startDate,
            membership_renewal_at: endDate,
            is_active: true
        };
        await this.update(uuid_company, payload as CompanyCreationAttributes, tenantContext);

        const limits = await this.saasPlanService.subscriptionLimitsForPlan(currentCompany.plan_type);
        await this.companyPaymentRepository.create({
            uuid_company,
            amount: 0,
            currency: 'USD',
            payment_method: null,
            paid_at: startDate,
            period_start: startDate,
            period_end: endDate,
            plan_type: currentCompany.plan_type,
            billing_cycle: currentCompany.billing_cycle,
            max_users: limits.max_users,
            max_animals: limits.max_animals,
            max_activity_records: limits.max_activity_records,
            status: 'POSTED'
        });
        await this.companyRepository.updateMembershipState(uuid_company, limits, tenantContext);

        const refreshed = await this.companyRepository.findById({
            id: uuid_company,
            uuid_company: tenantContext?.uuid_company
        });
        if (!refreshed) {
            throw new ApiError({
                name: 'NotFound',
                statusCode: HttpStatusCodes.NOT_FOUND,
                description: 'Company not found or inactive'
            });
        }

        return {
            success: true,
            data: await this.withAssignedPlan(refreshed.get({ plain: true }))
        };
    }

    private async withAssignedPlan(company: CompanyAttributes): Promise<CompanyAttributes> {
        const [withPlan] = await this.withAssignedPlans([company]);
        return withPlan;
    }

    private async withAssignedPlans(companies: CompanyAttributes[]): Promise<CompanyAttributes[]> {
        const summaries = await this.saasPlanService.findSummariesByCodes(
            companies.map((company) => company.plan_type)
        );
        return companies.map((company) => {
            const summary = this.saasPlanService.summaryForCode(company.plan_type, summaries);
            const lockedLimits = this.saasPlanService.lockedPlanLimits(company);
            return {
                ...company,
                plan: summary
                    ? { ...summary, limits: lockedLimits ?? summary.limits }
                    : null,
            };
        });
    }

    private buildCompanyPayload(
        companyBody: CompanyCreationAttributes,
        currentCompany?: CompanyAttributes
    ): CompanyCreationAttributes {
        const payload: CompanyCreationAttributes = {
            ...companyBody
        };
        delete payload.plan;
        delete payload.max_users;
        delete payload.max_animals;
        delete payload.max_activity_records;

        const effectiveStartedAt = companyBody.membership_started_at ?? currentCompany?.membership_started_at ?? null;
        const effectiveBillingCycle = companyBody.billing_cycle ?? currentCompany?.billing_cycle;

        payload.membership_started_at = effectiveStartedAt;
        payload.membership_renewal_at = this.calculateMembershipRenewalAt(effectiveStartedAt, effectiveBillingCycle);

        return payload;
    }

    async checkCompanyFieldAvailability(params: {
        name?: string;
        tax_id?: string;
        exclude_uuid_company?: string;
    }): Promise<ServiceResponse<CompanyFieldAvailabilityResult>> {
        const name = params.name?.trim();
        const taxId = params.tax_id?.trim();

        if (!name && !taxId) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'At least one of name or tax_id is required',
            });
        }

        const [nameHit, taxIdHit] = await Promise.all([
            name
                ? this.companyRepository.findConflictingName(name, params.exclude_uuid_company)
                : Promise.resolve(null),
            taxId
                ? this.companyRepository.findConflictingTaxId(taxId, params.exclude_uuid_company)
                : Promise.resolve(null),
        ]);

        return {
            success: true,
            data: {
                nameAvailable: name ? !nameHit : true,
                taxIdAvailable: taxId ? !taxIdHit : true,
            },
        };
    }

    private async assertUniqueCompanyFields(
        fields: { name: string; tax_id: string | null },
        excludeUuid?: string
    ): Promise<void> {
        const [nameHit, taxIdHit] = await Promise.all([
            this.companyRepository.findConflictingName(fields.name, excludeUuid),
            fields.tax_id
                ? this.companyRepository.findConflictingTaxId(fields.tax_id, excludeUuid)
                : Promise.resolve(null),
        ]);

        if (nameHit) {
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'COMPANY_NAME_IN_USE',
            });
        }

        if (taxIdHit) {
            throw new ApiError({
                name: 'Conflict',
                statusCode: HttpStatusCodes.CONFLICT,
                description: 'TAX_ID_IN_USE',
            });
        }
    }

    private normalizeOptionalString(value?: string | null): string | null {
        const trimmed = value?.trim();
        return trimmed ? trimmed : null;
    }

    private buildCompanyCreatePayload(companyBody: CompanyCreationAttributes): CompanyCreationAttributes {
        const name = String(companyBody.name ?? '').trim();
        if (!name) {
            throw new ApiError({
                name: 'ValidationError',
                statusCode: HttpStatusCodes.BAD_REQUEST,
                description: 'Company trade name is required',
            });
        }

        return {
            name,
            legal_name: this.normalizeOptionalString(companyBody.legal_name),
            tax_id: this.normalizeOptionalString(companyBody.tax_id),
            is_active: companyBody.is_active ?? true,
            membership_status: 'CANCELLED',
            membership_started_at: null,
            membership_renewal_at: null
        };
    }

    private calculateMembershipRenewalAt(
        membershipStartedAt: Date | string | null | undefined,
        billingCycle: CompanyAttributes['billing_cycle'] | undefined
    ): Date | null {
        if (!membershipStartedAt || !billingCycle) {
            return null;
        }

        const renewalDate = new Date(membershipStartedAt);
        if (Number.isNaN(renewalDate.getTime())) {
            return null;
        }

        if (billingCycle === 'SEMESTRAL') {
            renewalDate.setMonth(renewalDate.getMonth() + 6);
        }

        if (billingCycle === 'ANNUAL') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }

        return renewalDate;
    }
}

export default CompanyService;