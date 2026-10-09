import { BillingCycle, BILLING_CYCLES } from "./domain.constants";

/** Trims a stored or requested plan code. Does not invent a default plan. */
export function resolveCompanyPlanCode(plan: string | null | undefined): string {
    return String(plan ?? "").trim();
}

const LEGACY_BILLING_MAP: Record<string, BillingCycle> = {
    MONTHLY: "SEMESTRAL",
    SEMESTRAL: "SEMESTRAL",
    ANNUAL: "ANNUAL"
};

export function normalizeBillingCycle(cycle: string): BillingCycle {
    if (BILLING_CYCLES.includes(cycle as BillingCycle)) {
        return cycle as BillingCycle;
    }
    return LEGACY_BILLING_MAP[cycle] ?? "ANNUAL";
}

/**
 * Amount charged for the selected billing period.
 * Semestral = half of the annual catalog price (six months).
 */
export function chargeForBillingCycle(annualPrice: number, billingCycle: BillingCycle): number {
    const annual = Number(annualPrice);
    if (billingCycle === "ANNUAL") {
        return Number(annual.toFixed(2));
    }
    return Number((annual / 2).toFixed(2));
}
