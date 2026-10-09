"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAAS_PLAN_RESOURCE_CODES = exports.SAAS_PLAN_RESOURCE = void 0;
/** Resource codes enforced against saas_plan_limits. Not a closed PostgreSQL enum. */
exports.SAAS_PLAN_RESOURCE = {
    USERS: 'USERS',
    ANIMALS: 'ANIMALS',
    ACTIVITY_RECORDS: 'ACTIVITY_RECORDS',
};
exports.SAAS_PLAN_RESOURCE_CODES = [
    exports.SAAS_PLAN_RESOURCE.USERS,
    exports.SAAS_PLAN_RESOURCE.ANIMALS,
    exports.SAAS_PLAN_RESOURCE.ACTIVITY_RECORDS,
];
