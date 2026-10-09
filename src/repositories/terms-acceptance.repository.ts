import { Op } from 'sequelize';
import saasSequelize from '../database';
import CompanyModel from '../database/models/company.model';
import TermsAcceptanceModel from '../database/models/terms-acceptance.model';
import TermsVersionModel from '../database/models/terms-version.model';
import { ITermsAcceptanceRepository } from '../interfaces/repositories/terms-acceptance-repository.interface';
import {
    CompanyMembershipSnapshot,
    TermsAcceptanceAttributes,
    TermsAcceptanceCreationAttributes,
    TermsVersionAttributes,
    TermsVersionCreationAttributes,
} from '../interfaces/terms/terms.interface';

function toVersion(row: TermsVersionModel): TermsVersionAttributes {
    return row.get({ plain: true });
}

function toAcceptance(row: TermsAcceptanceModel): TermsAcceptanceAttributes {
    return row.get({ plain: true });
}

class TermsAcceptanceRepository implements ITermsAcceptanceRepository {
    async findCompany(uuidCompany: string): Promise<CompanyMembershipSnapshot | null> {
        const row = await CompanyModel.findByPk(uuidCompany);
        if (!row) {
            return null;
        }

        const plain = row.get({ plain: true });
        return {
            uuid_company: plain.uuid_company,
            is_active: plain.is_active,
            membership_status: plain.membership_status,
            membership_renewal_at: plain.membership_renewal_at ?? null,
        };
    }

    async findCurrentRequiredVersion(now: Date): Promise<TermsVersionAttributes | null> {
        const row = await TermsVersionModel.findOne({
            where: {
                is_active: true,
                requires_acceptance: true,
                effective_at: {
                    [Op.lte]: now,
                },
            },
            order: [
                ['effective_at', 'DESC'],
                ['created_at', 'DESC'],
            ],
        });

        return row ? toVersion(row) : null;
    }

    async findAcceptance(
        uuidUser: string,
        uuidCompany: string,
        uuidTermsVersion: string
    ): Promise<TermsAcceptanceAttributes | null> {
        const row = await TermsAcceptanceModel.findOne({
            where: {
                uuid_user: uuidUser,
                uuid_company: uuidCompany,
                uuid_terms_version: uuidTermsVersion,
            },
        });

        return row ? toAcceptance(row) : null;
    }

    async createAcceptance(data: TermsAcceptanceCreationAttributes): Promise<TermsAcceptanceAttributes> {
        const row = await TermsAcceptanceModel.create(data);
        return toAcceptance(row);
    }

    async findVersionById(uuidTermsVersion: string): Promise<TermsVersionAttributes | null> {
        const row = await TermsVersionModel.findByPk(uuidTermsVersion);
        return row ? toVersion(row) : null;
    }

    async findVersionByCode(version: string): Promise<TermsVersionAttributes | null> {
        const row = await TermsVersionModel.findOne({ where: { version } });
        return row ? toVersion(row) : null;
    }

    async listVersions(): Promise<TermsVersionAttributes[]> {
        const rows = await TermsVersionModel.findAll({
            order: [
                ['effective_at', 'DESC'],
                ['created_at', 'DESC'],
            ],
        });
        return rows.map(toVersion);
    }

    async insertVersion(
        data: TermsVersionCreationAttributes,
        publish: boolean
    ): Promise<TermsVersionAttributes> {
        const created = await saasSequelize.transaction(async (transaction) => {
            const row = await TermsVersionModel.create(
                {
                    ...data,
                    is_active: false,
                },
                { transaction }
            );

            if (publish) {
                await TermsVersionModel.update(
                    { is_active: false },
                    {
                        where: { is_active: true },
                        transaction,
                    }
                );
                await row.update({ is_active: true }, { transaction });
            }

            return row;
        });

        return toVersion(created);
    }

    async activateVersion(uuidTermsVersion: string): Promise<TermsVersionAttributes | null> {
        const updated = await saasSequelize.transaction(async (transaction) => {
            const row = await TermsVersionModel.findByPk(uuidTermsVersion, { transaction });
            if (!row) {
                return null;
            }

            await TermsVersionModel.update(
                { is_active: false },
                {
                    where: { is_active: true },
                    transaction,
                }
            );
            await row.update({ is_active: true }, { transaction });
            return row;
        });

        return updated ? toVersion(updated) : null;
    }
}

export default TermsAcceptanceRepository;
