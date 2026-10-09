import { Optional } from "sequelize";
import { BillingCycle, CompanyPlanType, MembershipStatus } from "../../constants/domain.constants";
import { CompanyPlanSummary } from "../saas-plan/saas-plan.interface";

export interface CompanyAttributes {
    uuid_company: string;
    name: string;
    legal_name?: string | null;
    tax_id?: string | null;
    /** PostgreSQL database name for this company operational data (ranch, animals, etc.). */
    tenant_database?: string | null;
    /** Schema revision applied to the tenant database; see TENANT_SCHEMA_VERSION. */
    tenant_schema_version?: number | null;
    plan_type: CompanyPlanType;
    /** Limits locked for the current subscription. Null until the first subscription. */
    max_users?: number | null;
    max_animals?: number | null;
    max_activity_records?: number | null;
    /** Catalog snapshot for responses. Not a companies column. */
    plan?: CompanyPlanSummary | null;
    billing_cycle: BillingCycle;
    membership_status: MembershipStatus;
    membership_started_at?: Date | null;
    membership_renewal_at?: Date | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CompanyCreationAttributes = Optional<
    CompanyAttributes,
    | 'uuid_company'
    | 'tenant_database'
    | 'tenant_schema_version'
    | 'plan_type'
    | 'max_users'
    | 'max_animals'
    | 'max_activity_records'
    | 'billing_cycle'
    | 'membership_status'
    | 'membership_started_at'
    | 'membership_renewal_at'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
>;
