"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const isDisabled = (value) => value === 'false' || value === '0' || value === 'no';
const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
/** Dev-only fallback. Production keeps an empty string so missing credentials cannot silently become demo values. */
function devDefault(value, fallback) {
    const trimmed = value?.trim() ?? '';
    if (trimmed) {
        return trimmed;
    }
    return isProduction ? '' : fallback;
}
/** Password is kept as provided. Only a missing/blank value uses the dev default. */
function devPassword(value) {
    if (value != null && value.trim() !== '') {
        return value;
    }
    return isProduction ? '' : 'Demo123!';
}
exports.envConfig = {
    NODE_ENV: nodeEnv,
    DB_USER: process.env.DB_USER || '',
    DB_PASSWORD: process.env.DB_PASSWORD || '',
    DB_NAME: process.env.DB_NAME || '',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: Number(process.env.DB_PORT) || 5432,
    /** Max cached tenant Sequelize connections per API process (LRU eviction). */
    TENANT_POOL_MAX: process.env.TENANT_POOL_MAX ? Number(process.env.TENANT_POOL_MAX) : undefined,
    PORT: process.env.PORT || '3010',
    JWT_SECRET: process.env.JWT_SECRET || '',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4730',
    /**
     * When true, SaaS Sequelize sync uses alter mode so missing columns/tables are created from models.
     * Use only in trusted dev/staging; prefer scripts/saas-tenant-rollout-ddl.sql in production.
     */
    DB_SYNC_ALTER: process.env.DB_SYNC_ALTER === 'true' || process.env.DB_SYNC_ALTER === '1',
    /** Idempotent bootstrap: create initial saas_owner when none exists. */
    SEED_SAAS_OWNER_ENABLED: !isDisabled(process.env.SEED_SAAS_OWNER_ENABLED),
    SEED_SAAS_COMPANY_NAME: process.env.SEED_SAAS_COMPANY_NAME?.trim() || 'Demo SaaS',
    SEED_SAAS_OWNER_EMAIL: devDefault(process.env.SEED_SAAS_OWNER_EMAIL, 'saas@test.com'),
    SEED_SAAS_OWNER_USERNAME: devDefault(process.env.SEED_SAAS_OWNER_USERNAME, 'saas.owner'),
    SEED_SAAS_OWNER_PASSWORD: devPassword(process.env.SEED_SAAS_OWNER_PASSWORD),
    SEED_SAAS_OWNER_FIRST_NAME: process.env.SEED_SAAS_OWNER_FIRST_NAME?.trim() || 'SaaS',
    SEED_SAAS_OWNER_LAST_NAME: process.env.SEED_SAAS_OWNER_LAST_NAME?.trim() || 'Admin',
    SEED_SAAS_OWNER_ID_CARD: process.env.SEED_SAAS_OWNER_ID_CARD?.trim() || '0000000000',
};
