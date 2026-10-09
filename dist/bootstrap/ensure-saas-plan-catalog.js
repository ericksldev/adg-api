"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSaasPlanCatalog = ensureSaasPlanCatalog;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function resolveMigrationPath() {
    const candidates = [
        node_path_1.default.join(__dirname, '../../scripts/migrate-saas-plans.sql'),
        node_path_1.default.join(__dirname, '../../../scripts/migrate-saas-plans.sql'),
    ];
    const found = candidates.find((candidate) => node_fs_1.default.existsSync(candidate));
    if (!found) {
        throw new Error('SaaS plan migration script was not found');
    }
    return found;
}
/** Applies the idempotent SaaS plan catalog script after Sequelize sync. */
async function ensureSaasPlanCatalog(sequelize) {
    const sql = node_fs_1.default.readFileSync(resolveMigrationPath(), 'utf8');
    await sequelize.query(sql);
}
