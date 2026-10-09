"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../database"));
const company_model_1 = __importDefault(require("../database/models/company.model"));
const terms_acceptance_model_1 = __importDefault(require("../database/models/terms-acceptance.model"));
const terms_version_model_1 = __importDefault(require("../database/models/terms-version.model"));
function toVersion(row) {
    return row.get({ plain: true });
}
function toAcceptance(row) {
    return row.get({ plain: true });
}
class TermsAcceptanceRepository {
    async findCompany(uuidCompany) {
        const row = await company_model_1.default.findByPk(uuidCompany);
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
    async findCurrentRequiredVersion(now) {
        const row = await terms_version_model_1.default.findOne({
            where: {
                is_active: true,
                requires_acceptance: true,
                effective_at: {
                    [sequelize_1.Op.lte]: now,
                },
            },
            order: [
                ['effective_at', 'DESC'],
                ['created_at', 'DESC'],
            ],
        });
        return row ? toVersion(row) : null;
    }
    async findAcceptance(uuidUser, uuidCompany, uuidTermsVersion) {
        const row = await terms_acceptance_model_1.default.findOne({
            where: {
                uuid_user: uuidUser,
                uuid_company: uuidCompany,
                uuid_terms_version: uuidTermsVersion,
            },
        });
        return row ? toAcceptance(row) : null;
    }
    async createAcceptance(data) {
        const row = await terms_acceptance_model_1.default.create(data);
        return toAcceptance(row);
    }
    async findVersionById(uuidTermsVersion) {
        const row = await terms_version_model_1.default.findByPk(uuidTermsVersion);
        return row ? toVersion(row) : null;
    }
    async findVersionByCode(version) {
        const row = await terms_version_model_1.default.findOne({ where: { version } });
        return row ? toVersion(row) : null;
    }
    async listVersions() {
        const rows = await terms_version_model_1.default.findAll({
            order: [
                ['effective_at', 'DESC'],
                ['created_at', 'DESC'],
            ],
        });
        return rows.map(toVersion);
    }
    async insertVersion(data, publish) {
        const created = await database_1.default.transaction(async (transaction) => {
            const row = await terms_version_model_1.default.create({
                ...data,
                is_active: false,
            }, { transaction });
            if (publish) {
                await terms_version_model_1.default.update({ is_active: false }, {
                    where: { is_active: true },
                    transaction,
                });
                await row.update({ is_active: true }, { transaction });
            }
            return row;
        });
        return toVersion(created);
    }
    async activateVersion(uuidTermsVersion) {
        const updated = await database_1.default.transaction(async (transaction) => {
            const row = await terms_version_model_1.default.findByPk(uuidTermsVersion, { transaction });
            if (!row) {
                return null;
            }
            await terms_version_model_1.default.update({ is_active: false }, {
                where: { is_active: true },
                transaction,
            });
            await row.update({ is_active: true }, { transaction });
            return row;
        });
        return updated ? toVersion(updated) : null;
    }
}
exports.default = TermsAcceptanceRepository;
