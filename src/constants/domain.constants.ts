import { UserRole } from "../interfaces/roles/roles.interface";

/** Plan code stored on the company. The commercial catalog is saas_plans, not a fixed list. */
export type CompanyPlanType = string;

export const BILLING_CYCLES = ['SEMESTRAL', 'ANNUAL'] as const;
export type BillingCycle = typeof BILLING_CYCLES[number];

export const MEMBERSHIP_STATUSES = ['TRIAL', 'ACTIVE', 'CANCELLED'] as const;
export type MembershipStatus = typeof MEMBERSHIP_STATUSES[number];

export const PAYMENT_STATUSES = ['POSTED', 'VOIDED'] as const;
export type PaymentStatus = typeof PAYMENT_STATUSES[number];

export const PAYMENT_METHODS = ['bank_transfer', 'qr_payment', 'manual_payment'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export const USER_ROLES = [
    UserRole.SAAS_OWNER,
    UserRole.ADMINISTRATOR,
    UserRole.RANCH_STAFF,
] as const;
