"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSaasOwnerIfNeeded = seedSaasOwnerIfNeeded;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const config_1 = require("../config");
const company_model_1 = __importDefault(require("../database/models/company.model"));
const user_model_1 = __importDefault(require("../database/models/user.model"));
const roles_interface_1 = require("../interfaces/roles/roles.interface");
/**
 * Creates the platform saas_owner (and seed company) once per database.
 * Safe on every deploy: skips when any active saas_owner already exists.
 */
function assertProductionSeedCredentials() {
    if (config_1.envConfig.NODE_ENV !== 'production') {
        return;
    }
    const missing = [];
    if (!config_1.envConfig.SEED_SAAS_OWNER_EMAIL) {
        missing.push('SEED_SAAS_OWNER_EMAIL');
    }
    if (!config_1.envConfig.SEED_SAAS_OWNER_USERNAME) {
        missing.push('SEED_SAAS_OWNER_USERNAME');
    }
    if (!config_1.envConfig.SEED_SAAS_OWNER_PASSWORD) {
        missing.push('SEED_SAAS_OWNER_PASSWORD');
    }
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables when SEED_SAAS_OWNER_ENABLED=true and NODE_ENV=production: ${missing.join(', ')}`);
    }
}
async function seedSaasOwnerIfNeeded() {
    if (!config_1.envConfig.SEED_SAAS_OWNER_ENABLED) {
        return;
    }
    assertProductionSeedCredentials();
    const existingOwner = await user_model_1.default.findOne({
        where: {
            role: roles_interface_1.UserRole.SAAS_OWNER,
            is_active: true,
        },
    });
    if (existingOwner) {
        console.log('SaaS owner seed: skipped (saas_owner already exists).');
        return;
    }
    const email = config_1.envConfig.SEED_SAAS_OWNER_EMAIL;
    const username = config_1.envConfig.SEED_SAAS_OWNER_USERNAME;
    const password = config_1.envConfig.SEED_SAAS_OWNER_PASSWORD;
    if (!email || !username || !password) {
        console.warn('SaaS owner seed: skipped (missing SEED_SAAS_OWNER_EMAIL, USERNAME, or PASSWORD).');
        return;
    }
    const duplicateLogin = await user_model_1.default.findOne({
        where: {
            [sequelize_1.Op.or]: [{ email }, { username }],
        },
    });
    if (duplicateLogin) {
        console.warn('SaaS owner seed: skipped (email or username already in use; no saas_owner role assigned).');
        return;
    }
    const companyName = config_1.envConfig.SEED_SAAS_COMPANY_NAME;
    let company = await company_model_1.default.findOne({ where: { name: companyName } });
    if (!company) {
        company = await company_model_1.default.create({
            name: companyName,
            membership_status: 'ACTIVE',
            is_active: true,
        });
        console.log(`SaaS owner seed: created company "${companyName}".`);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    await user_model_1.default.create({
        uuid_company: company.uuid_company,
        id_card: config_1.envConfig.SEED_SAAS_OWNER_ID_CARD,
        first_name: config_1.envConfig.SEED_SAAS_OWNER_FIRST_NAME,
        last_name: config_1.envConfig.SEED_SAAS_OWNER_LAST_NAME,
        email,
        username,
        password: hashedPassword,
        role: roles_interface_1.UserRole.SAAS_OWNER,
        is_active: true,
    });
    console.log(`SaaS owner seed: created user "${username}" (${email}).`);
}
