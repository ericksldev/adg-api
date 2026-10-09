import { Optional } from "sequelize";
import { BillingCycle, CompanyPlanType, PaymentMethod, PaymentStatus } from "../../constants/domain.constants";

export interface CompanyPaymentAttributes {
    uuid_company_payment: string;
    uuid_company: string;
    amount: number;
    currency: string;
    /** Bolivianos per 1 unit of `currency`. Required on paid activation. */
    exchange_rate?: number | null;
    /** `amount` converted with `exchange_rate`, stored for audit. */
    amount_bob?: number | null;
    payment_method?: PaymentMethod | null;
    payment_reference?: string | null;
    notes?: string | null;
    paid_at: Date;
    period_start?: Date | null;
    period_end?: Date | null;
    plan_type: CompanyPlanType;
    /** Plan limits copied when this subscription was created. */
    max_users?: number | null;
    max_animals?: number | null;
    max_activity_records?: number | null;
    billing_cycle: BillingCycle;
    status: PaymentStatus;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CompanyPaymentCreationAttributes = Optional<
    CompanyPaymentAttributes,
    | 'uuid_company_payment'
    | 'amount'
    | 'currency'
    | 'exchange_rate'
    | 'amount_bob'
    | 'payment_method'
    | 'payment_reference'
    | 'notes'
    | 'period_start'
    | 'period_end'
    | 'max_users'
    | 'max_animals'
    | 'max_activity_records'
    | 'status'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
>;
