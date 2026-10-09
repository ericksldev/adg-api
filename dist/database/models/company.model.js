"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../../database"));
const domain_constants_1 = require("../../constants/domain.constants");
class CompanyModel extends sequelize_1.Model {
}
CompanyModel.init({
    uuid_company: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    legal_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    tax_id: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    plan_type: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
        defaultValue: 'VRETE_EMPRESARIAL',
    },
    max_users: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    max_animals: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    max_activity_records: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    billing_cycle: {
        type: sequelize_1.DataTypes.ENUM(...domain_constants_1.BILLING_CYCLES),
        allowNull: false,
        defaultValue: 'ANNUAL',
    },
    membership_status: {
        type: sequelize_1.DataTypes.ENUM(...domain_constants_1.MEMBERSHIP_STATUSES),
        allowNull: false,
        defaultValue: 'CANCELLED',
    },
    membership_started_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    membership_renewal_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    tenant_database: {
        type: sequelize_1.DataTypes.STRING(128),
        allowNull: true,
    },
    tenant_schema_version: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
    }
}, {
    sequelize: database_1.default,
    tableName: 'companies',
    modelName: 'Company',
    timestamps: true,
    underscored: true,
});
exports.default = CompanyModel;
