"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../../database"));
class TermsAcceptanceModel extends sequelize_1.Model {
}
TermsAcceptanceModel.init({
    uuid_terms_acceptance: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    uuid_user: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    uuid_company: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    uuid_terms_version: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    accepted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    ip_address: {
        type: sequelize_1.DataTypes.STRING(128),
        allowNull: true,
    },
    user_agent: {
        type: sequelize_1.DataTypes.STRING(512),
        allowNull: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'terms_acceptances',
    modelName: 'TermsAcceptance',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'terms_acceptances_user_company_version_uk',
            unique: true,
            fields: ['uuid_user', 'uuid_company', 'uuid_terms_version'],
        },
        {
            name: 'terms_acceptances_company_user_idx',
            fields: ['uuid_company', 'uuid_user'],
        },
    ],
});
exports.default = TermsAcceptanceModel;
