import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';
import { ITenantProvisioningService } from '../interfaces/services/tenant-provisioning-service.interface';
import CompanyRepository from '../repositories/company.repository';

/**
 * Creates the tenant database and links it on the company row, then builds the operational schema.
 * `tenant_schema_version` is recorded only after sync and patches succeed (inside tenant bootstrap).
 * Ranches are created later (SaaS UI or company administrator).
 */
export async function attachOperationalTenantToCompany(
    uuid_company: string,
    tenantProvisioningService: ITenantProvisioningService,
    companyRepository: CompanyRepository
): Promise<{ tenant_database: string }> {
    const tenantDatabase = await tenantProvisioningService.provisionDatabase(uuid_company);

    const updatedCompany = await companyRepository.updateTenantProvisioning(uuid_company, {
        tenant_database: tenantDatabase,
    });

    if (!updatedCompany) {
        throw new ApiError({
            name: 'InternalError',
            statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
            description: 'Failed to persist tenant_database on company',
        });
    }

    await tenantProvisioningService.bootstrapOperationalTenant(tenantDatabase);

    return { tenant_database: tenantDatabase };
}
