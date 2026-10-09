import app from './app';
import saasSequelize from './database/saas-sequelize';
import {envConfig} from "./config";
import './database/saas-models.register';
import { seedSaasOwnerIfNeeded } from './bootstrap/seed-saas-owner';
import { ensureSaasPlanCatalog } from './bootstrap/ensure-saas-plan-catalog';
import { ensureInitialTermsVersion } from './bootstrap/ensure-initial-terms-version';

process.on('uncaughtException', (err) => {
    console.error('uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection:', reason);
});

saasSequelize.authenticate()
    .then(() => {
        console.log('SaaS database connected');
        const syncAlter = envConfig.DB_SYNC_ALTER;
        if (syncAlter) {
            console.warn('SaaS DB sync: alter=true (DB_SYNC_ALTER); do not use in production without review.');
        }
        return saasSequelize.sync({ alter: syncAlter });
    })
    .then(() => ensureSaasPlanCatalog(saasSequelize))
    .then(() => ensureInitialTermsVersion(saasSequelize))
    .then(() => seedSaasOwnerIfNeeded())
    .then(() => {
        const port = Number(envConfig.PORT) || 3010;
        app.listen(port, '0.0.0.0', () => {
            console.log(`Server running on http://0.0.0.0:${port} (localhost:${port})`);
        });
    })
    .catch((err: Error) => {
        console.error('Startup failed:', err.message);
        process.exit(1);
    });

