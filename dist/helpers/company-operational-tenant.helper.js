"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachOperationalTenantToCompany = attachOperationalTenantToCompany;
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
/**
 * Creates the tenant database and links it on the company row, then builds the operational schema.
 * `tenant_schema_version` is recorded only after sync and patches succeed (inside tenant bootstrap).
 * Ranches are created later (SaaS UI or company administrator).
 */
async function attachOperationalTenantToCompany(uuid_company, tenantProvisioningService, companyRepository) {
    const tenantDatabase = await tenantProvisioningService.provisionDatabase(uuid_company);
    const updatedCompany = await companyRepository.updateTenantProvisioning(uuid_company, {
        tenant_database: tenantDatabase,
    });
    if (!updatedCompany) {
        throw new apiError_1.default({
            name: 'InternalError',
            statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
            description: 'Failed to persist tenant_database on company',
        });
    }
    await tenantProvisioningService.bootstrapOperationalTenant(tenantDatabase);
    return { tenant_database: tenantDatabase };
}
