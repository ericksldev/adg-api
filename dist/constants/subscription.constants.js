"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCompanyPlanCode = resolveCompanyPlanCode;
exports.normalizeBillingCycle = normalizeBillingCycle;
exports.chargeForBillingCycle = chargeForBillingCycle;
const domain_constants_1 = require("./domain.constants");
/** Trims a stored or requested plan code. Does not invent a default plan. */
function resolveCompanyPlanCode(plan) {
    return String(plan ?? "").trim();
}
const LEGACY_BILLING_MAP = {
    MONTHLY: "SEMESTRAL",
    SEMESTRAL: "SEMESTRAL",
    ANNUAL: "ANNUAL"
};
function normalizeBillingCycle(cycle) {
    if (domain_constants_1.BILLING_CYCLES.includes(cycle)) {
        return cycle;
    }
    return LEGACY_BILLING_MAP[cycle] ?? "ANNUAL";
}
/**
 * Amount charged for the selected billing period.
 * Semestral = half of the annual catalog price (six months).
 */
function chargeForBillingCycle(annualPrice, billingCycle) {
    const annual = Number(annualPrice);
    if (billingCycle === "ANNUAL") {
        return Number(annual.toFixed(2));
    }
    return Number((annual / 2).toFixed(2));
}
