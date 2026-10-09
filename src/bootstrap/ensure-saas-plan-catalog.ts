import fs from 'node:fs';
import path from 'node:path';
import { Sequelize } from 'sequelize';

function resolveMigrationPath(): string {
    const candidates = [
        path.join(__dirname, '../../scripts/migrate-saas-plans.sql'),
        path.join(__dirname, '../../../scripts/migrate-saas-plans.sql'),
    ];
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
        throw new Error('SaaS plan migration script was not found');
    }
    return found;
}

/** Applies the idempotent SaaS plan catalog script after Sequelize sync. */
export async function ensureSaasPlanCatalog(sequelize: Sequelize): Promise<void> {
    const sql = fs.readFileSync(resolveMigrationPath(), 'utf8');
    await sequelize.query(sql);
}
