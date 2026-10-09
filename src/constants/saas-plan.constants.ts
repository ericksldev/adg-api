/** Resource codes enforced against saas_plan_limits. Not a closed PostgreSQL enum. */
export const SAAS_PLAN_RESOURCE = {
    USERS: 'USERS',
    ANIMALS: 'ANIMALS',
    ACTIVITY_RECORDS: 'ACTIVITY_RECORDS',
} as const;

export type SaasPlanResourceCode = (typeof SAAS_PLAN_RESOURCE)[keyof typeof SAAS_PLAN_RESOURCE];

export const SAAS_PLAN_RESOURCE_CODES: readonly SaasPlanResourceCode[] = [
    SAAS_PLAN_RESOURCE.USERS,
    SAAS_PLAN_RESOURCE.ANIMALS,
    SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS,
];
