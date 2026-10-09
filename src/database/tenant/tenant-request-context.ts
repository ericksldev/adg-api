import { AsyncLocalStorage } from 'node:async_hooks';
import { Sequelize } from 'sequelize';
import ApiError from '../../errors/apiError';
import HttpStatusCodes from '../../errors/httpStatusCodes';
import type { TenantDomainModels } from './tenant-domain-associations';

export type TenantRequestStore = {
    uuid_company: string;
    tenantDatabaseName: string;
    sequelize: Sequelize;
    models: TenantDomainModels;
};

export const tenantRequestStorage = new AsyncLocalStorage<TenantRequestStore>();

export function requireTenantModels(): TenantDomainModels {
    const store = tenantRequestStorage.getStore();
    if (!store?.models) {
        throw new ApiError({
            name: 'InternalError',
            statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
            description: 'Tenant operational context is not initialized for this request',
        });
    }
    return store.models;
}

export function requireTenantSequelize(): Sequelize {
    const store = tenantRequestStorage.getStore();
    if (!store?.sequelize) {
        throw new ApiError({
            name: 'InternalError',
            statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
            description: 'Tenant operational context is not initialized for this request',
        });
    }
    return store.sequelize;
}
