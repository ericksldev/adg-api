"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureInitialTermsVersion = ensureInitialTermsVersion;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const terms_constants_1 = require("../constants/terms.constants");
const container_1 = require("../containers/container");
const apiError_1 = __importDefault(require("../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../errors/httpStatusCodes"));
function resolveExistingPath(candidates, missingMessage) {
    const found = candidates.find((candidate) => node_fs_1.default.existsSync(candidate));
    if (!found) {
        throw new Error(missingMessage);
    }
    return found;
}
function resolveMigrationPath() {
    return resolveExistingPath([
        node_path_1.default.join(__dirname, '../scripts/migrate-terms-acceptance.sql'),
        node_path_1.default.join(__dirname, '../../scripts/migrate-terms-acceptance.sql'),
        node_path_1.default.join(__dirname, '../../../scripts/migrate-terms-acceptance.sql'),
    ], 'Terms acceptance migration script was not found');
}
function resolveDocumentPath() {
    return resolveExistingPath([
        node_path_1.default.join(__dirname, '../utils/vrete-terms-of-service.txt'),
        node_path_1.default.join(__dirname, '../../src/utils/vrete-terms-of-service.txt'),
        node_path_1.default.join(process.cwd(), 'src/utils/vrete-terms-of-service.txt'),
    ], 'Initial terms of service document was not found');
}
function publishedDocument(raw) {
    return raw
        .split('[VERSIÓN]')
        .join(terms_constants_1.INITIAL_TERMS_VERSION)
        .split('[FECHA]')
        .join(terms_constants_1.INITIAL_TERMS_UPDATED_LABEL);
}
/**
 * Creates the terms tables if needed and inserts version 1.0 once.
 * An existing 1.0 row is left unchanged so a later edit in the database is not overwritten.
 */
async function ensureInitialTermsVersion(sequelize) {
    const sql = node_fs_1.default.readFileSync(resolveMigrationPath(), 'utf8');
    await sequelize.query(sql);
    const existing = await container_1.container.termsAcceptanceService.findVersionByCode(terms_constants_1.INITIAL_TERMS_VERSION);
    if (existing) {
        console.log(`Terms seed: skipped (version ${terms_constants_1.INITIAL_TERMS_VERSION} already exists).`);
        return;
    }
    const content = publishedDocument(node_fs_1.default.readFileSync(resolveDocumentPath(), 'utf8'));
    try {
        await container_1.container.termsAcceptanceService.createVersion({
            version: terms_constants_1.INITIAL_TERMS_VERSION,
            title: terms_constants_1.INITIAL_TERMS_TITLE,
            content,
            effective_at: terms_constants_1.INITIAL_TERMS_EFFECTIVE_AT,
            requires_acceptance: true,
            publish: true,
        });
        console.log(`Terms seed: published version ${terms_constants_1.INITIAL_TERMS_VERSION}.`);
    }
    catch (error) {
        if (error instanceof apiError_1.default && error.statusCode === httpStatusCodes_1.default.CONFLICT) {
            console.log(`Terms seed: skipped (version ${terms_constants_1.INITIAL_TERMS_VERSION} already exists).`);
            return;
        }
        throw error;
    }
}
