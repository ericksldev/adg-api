import fs from 'node:fs';
import path from 'node:path';
import { Sequelize } from 'sequelize';
import {
    INITIAL_TERMS_EFFECTIVE_AT,
    INITIAL_TERMS_TITLE,
    INITIAL_TERMS_UPDATED_LABEL,
    INITIAL_TERMS_VERSION,
} from '../constants/terms.constants';
import { container } from '../containers/container';
import ApiError from '../errors/apiError';
import HttpStatusCodes from '../errors/httpStatusCodes';

function resolveExistingPath(candidates: string[], missingMessage: string): string {
    const found = candidates.find((candidate) => fs.existsSync(candidate));
    if (!found) {
        throw new Error(missingMessage);
    }
    return found;
}

function resolveMigrationPath(): string {
    return resolveExistingPath(
        [
            path.join(__dirname, '../scripts/migrate-terms-acceptance.sql'),
            path.join(__dirname, '../../scripts/migrate-terms-acceptance.sql'),
            path.join(__dirname, '../../../scripts/migrate-terms-acceptance.sql'),
        ],
        'Terms acceptance migration script was not found'
    );
}

function resolveDocumentPath(): string {
    return resolveExistingPath(
        [
            path.join(__dirname, '../utils/vrete-terms-of-service.txt'),
            path.join(__dirname, '../../src/utils/vrete-terms-of-service.txt'),
            path.join(process.cwd(), 'src/utils/vrete-terms-of-service.txt'),
        ],
        'Initial terms of service document was not found'
    );
}

function publishedDocument(raw: string): string {
    return raw
        .split('[VERSIÓN]')
        .join(INITIAL_TERMS_VERSION)
        .split('[FECHA]')
        .join(INITIAL_TERMS_UPDATED_LABEL);
}

/**
 * Creates the terms tables if needed and inserts version 1.0 once.
 * An existing 1.0 row is left unchanged so a later edit in the database is not overwritten.
 */
export async function ensureInitialTermsVersion(sequelize: Sequelize): Promise<void> {
    const sql = fs.readFileSync(resolveMigrationPath(), 'utf8');
    await sequelize.query(sql);

    const existing = await container.termsAcceptanceService.findVersionByCode(INITIAL_TERMS_VERSION);
    if (existing) {
        console.log(`Terms seed: skipped (version ${INITIAL_TERMS_VERSION} already exists).`);
        return;
    }

    const content = publishedDocument(fs.readFileSync(resolveDocumentPath(), 'utf8'));

    try {
        await container.termsAcceptanceService.createVersion({
            version: INITIAL_TERMS_VERSION,
            title: INITIAL_TERMS_TITLE,
            content,
            effective_at: INITIAL_TERMS_EFFECTIVE_AT,
            requires_acceptance: true,
            publish: true,
        });
        console.log(`Terms seed: published version ${INITIAL_TERMS_VERSION}.`);
    } catch (error) {
        if (error instanceof ApiError && error.statusCode === HttpStatusCodes.CONFLICT) {
            console.log(`Terms seed: skipped (version ${INITIAL_TERMS_VERSION} already exists).`);
            return;
        }
        throw error;
    }
}
