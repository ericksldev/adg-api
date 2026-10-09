import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { envConfig } from '../config';
import CompanyModel from '../database/models/company.model';
import UserModel from '../database/models/user.model';
import { UserRole } from '../interfaces/roles/roles.interface';

/**
 * Creates the platform saas_owner (and seed company) once per database.
 * Safe on every deploy: skips when any active saas_owner already exists.
 */
function assertProductionSeedCredentials(): void {
    if (envConfig.NODE_ENV !== 'production') {
        return;
    }

    const missing: string[] = [];
    if (!envConfig.SEED_SAAS_OWNER_EMAIL) {
        missing.push('SEED_SAAS_OWNER_EMAIL');
    }
    if (!envConfig.SEED_SAAS_OWNER_USERNAME) {
        missing.push('SEED_SAAS_OWNER_USERNAME');
    }
    if (!envConfig.SEED_SAAS_OWNER_PASSWORD) {
        missing.push('SEED_SAAS_OWNER_PASSWORD');
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables when SEED_SAAS_OWNER_ENABLED=true and NODE_ENV=production: ${missing.join(', ')}`
        );
    }
}

export async function seedSaasOwnerIfNeeded(): Promise<void> {
    if (!envConfig.SEED_SAAS_OWNER_ENABLED) {
        return;
    }

    assertProductionSeedCredentials();

    const existingOwner = await UserModel.findOne({
        where: {
            role: UserRole.SAAS_OWNER,
            is_active: true,
        },
    });

    if (existingOwner) {
        console.log('SaaS owner seed: skipped (saas_owner already exists).');
        return;
    }

    const email = envConfig.SEED_SAAS_OWNER_EMAIL;
    const username = envConfig.SEED_SAAS_OWNER_USERNAME;
    const password = envConfig.SEED_SAAS_OWNER_PASSWORD;

    if (!email || !username || !password) {
        console.warn('SaaS owner seed: skipped (missing SEED_SAAS_OWNER_EMAIL, USERNAME, or PASSWORD).');
        return;
    }

    const duplicateLogin = await UserModel.findOne({
        where: {
            [Op.or]: [{ email }, { username }],
        },
    });

    if (duplicateLogin) {
        console.warn(
            'SaaS owner seed: skipped (email or username already in use; no saas_owner role assigned).'
        );
        return;
    }

    const companyName = envConfig.SEED_SAAS_COMPANY_NAME;
    let company = await CompanyModel.findOne({ where: { name: companyName } });

    if (!company) {
        company = await CompanyModel.create({
            name: companyName,
            membership_status: 'ACTIVE',
            is_active: true,
        });
        console.log(`SaaS owner seed: created company "${companyName}".`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await UserModel.create({
        uuid_company: company.uuid_company,
        id_card: envConfig.SEED_SAAS_OWNER_ID_CARD,
        first_name: envConfig.SEED_SAAS_OWNER_FIRST_NAME,
        last_name: envConfig.SEED_SAAS_OWNER_LAST_NAME,
        email,
        username,
        password: hashedPassword,
        role: UserRole.SAAS_OWNER,
        is_active: true,
    });

    console.log(`SaaS owner seed: created user "${username}" (${email}).`);
}
