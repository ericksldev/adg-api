import { Sequelize } from 'sequelize';
import dbConfig from '../../config/database.config';
import { envConfig } from '../../config/env.config';
import { DEFAULT_TENANT_POOL_MAX, TENANT_SCHEMA_VERSION } from '../../constants/tenant.constants';
import CompanyModel from '../models/company.model';
import { buildTenantModelsForSequelize, TenantDomainModels } from './tenant-models.factory';
import { syncTenantOperationalSchema } from './tenant-schema.service';

type PoolEntry = {
    sequelize: Sequelize;
    models: TenantDomainModels;
    lastUsed: number;
};

const pool = new Map<string, PoolEntry>();
const accessOrder: string[] = [];
/** Dedupes concurrent first-time tenant DB init (schema sync + DDL patches). */
const initPromises = new Map<string, Promise<PoolEntry>>();

function maxPoolSize(): number {
    const raw = envConfig.TENANT_POOL_MAX;
    if (raw == null || Number.isNaN(Number(raw))) {
        return DEFAULT_TENANT_POOL_MAX;
    }
    return Math.max(1, Math.min(256, Number(raw)));
}

function touchOrder(databaseName: string): void {
    const idx = accessOrder.indexOf(databaseName);
    if (idx >= 0) {
        accessOrder.splice(idx, 1);
    }
    accessOrder.push(databaseName);
}

async function evictIfNeeded(): Promise<void> {
    const max = maxPoolSize();
    while (pool.size >= max && accessOrder.length > 0) {
        const victim = accessOrder.shift();
        if (!victim) {
            break;
        }
        const entry = pool.get(victim);
        if (entry) {
            pool.delete(victim);
            await entry.sequelize.close().catch(() => undefined);
        }
    }
}

/**
 * LRU-ish pool of Sequelize instances keyed by tenant PostgreSQL database name.
 */
async function createTenantPoolEntry(databaseName: string): Promise<PoolEntry> {
    await evictIfNeeded();

    const sequelize = new Sequelize(databaseName, dbConfig.user as string, dbConfig.password as string, {
        host: dbConfig.host,
        port: Number(dbConfig.port),
        dialect: 'postgres',
        logging: false,
        dialectOptions: dbConfig.dialectOptions,
    });

    const models = buildTenantModelsForSequelize(sequelize);

    try {
        const company = await CompanyModel.findOne({
            where: { tenant_database: databaseName },
            attributes: ['uuid_company', 'tenant_schema_version'],
        });

        if (!company) {
            throw new Error(
                `Cannot prepare tenant schema: no company is linked to database ${databaseName}`
            );
        }

        const appliedVersion = company.tenant_schema_version;
        const schemaIsCurrent = appliedVersion != null && Number(appliedVersion) === TENANT_SCHEMA_VERSION;

        if (!schemaIsCurrent) {
            await syncTenantOperationalSchema(sequelize, models);
            const [updatedCount] = await CompanyModel.update(
                { tenant_schema_version: TENANT_SCHEMA_VERSION },
                { where: { uuid_company: company.uuid_company } }
            );
            if (updatedCount === 0) {
                throw new Error(
                    `Cannot record tenant_schema_version for database ${databaseName}`
                );
            }
        }

        const entry: PoolEntry = { sequelize, models, lastUsed: Date.now() };
        pool.set(databaseName, entry);
        touchOrder(databaseName);
        return entry;
    } catch (error) {
        await sequelize.close().catch(() => undefined);
        throw error;
    }
}

export async function getTenantPoolEntry(databaseName: string): Promise<PoolEntry> {
    const existing = pool.get(databaseName);
    if (existing) {
        existing.lastUsed = Date.now();
        touchOrder(databaseName);
        return existing;
    }

    const inFlight = initPromises.get(databaseName);
    if (inFlight) {
        return inFlight;
    }

    const initPromise = (async (): Promise<PoolEntry> => {
        const cached = pool.get(databaseName);
        if (cached) {
            cached.lastUsed = Date.now();
            touchOrder(databaseName);
            return cached;
        }
        return createTenantPoolEntry(databaseName);
    })();

    initPromises.set(databaseName, initPromise);
    try {
        return await initPromise;
    } finally {
        initPromises.delete(databaseName);
    }
}

export async function closeAllTenantPoolConnections(): Promise<void> {
    for (const [, entry] of pool) {
        await entry.sequelize.close().catch(() => undefined);
    }
    pool.clear();
    accessOrder.length = 0;
}
