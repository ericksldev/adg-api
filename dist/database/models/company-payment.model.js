"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../../database"));
const domain_constants_1 = require("../../constants/domain.constants");
class CompanyPaymentModel extends sequelize_1.Model {
}
CompanyPaymentModel.init({
    uuid_company_payment: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    uuid_company: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    amount: {
        type: sequelize_1.DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    currency: {
        type: sequelize_1.DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
    },
    exchange_rate: {
        type: sequelize_1.DataTypes.DECIMAL(14, 6),
        allowNull: true,
    },
    amount_bob: {
        type: sequelize_1.DataTypes.DECIMAL(12, 2),
        allowNull: true,
    },
    payment_method: {
        type: sequelize_1.DataTypes.ENUM(...domain_constants_1.PAYMENT_METHODS),
        allowNull: true,
    },
    payment_reference: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    paid_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    period_start: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    period_end: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
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
    status: {
        type: sequelize_1.DataTypes.ENUM(...domain_constants_1.PAYMENT_STATUSES),
        allowNull: false,
        defaultValue: 'POSTED',
    },
    is_active: {
        type: sequelize_1.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    sequelize: database_1.default,
    tableName: 'company_payments',
    modelName: 'CompanyPayment',
    timestamps: true,
    underscored: true,
});
exports.default = CompanyPaymentModel;
