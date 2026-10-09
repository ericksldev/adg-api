"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const saas_sequelize_1 = __importDefault(require("./database/saas-sequelize"));
const config_1 = require("./config");
require("./database/saas-models.register");
const seed_saas_owner_1 = require("./bootstrap/seed-saas-owner");
const ensure_saas_plan_catalog_1 = require("./bootstrap/ensure-saas-plan-catalog");
const ensure_initial_terms_version_1 = require("./bootstrap/ensure-initial-terms-version");
process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason);
});
saas_sequelize_1.default.authenticate()
    .then(() => {
    console.log('SaaS database connected');
    const syncAlter = config_1.envConfig.DB_SYNC_ALTER;
    if (syncAlter) {
        console.warn('SaaS DB sync: alter=true (DB_SYNC_ALTER); do not use in production without review.');
    }
    return saas_sequelize_1.default.sync({ alter: syncAlter });
})
    .then(() => (0, ensure_saas_plan_catalog_1.ensureSaasPlanCatalog)(saas_sequelize_1.default))
    .then(() => (0, ensure_initial_terms_version_1.ensureInitialTermsVersion)(saas_sequelize_1.default))
    .then(() => (0, seed_saas_owner_1.seedSaasOwnerIfNeeded)())
    .then(() => {
    const port = Number(config_1.envConfig.PORT) || 3010;
    app_1.default.listen(port, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${port} (localhost:${port})`);
    });
})
    .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
});
