import { DataTypes, Model } from "sequelize";
import sequelize from "../../database";
import {
    CompanyPaymentAttributes,
    CompanyPaymentCreationAttributes
} from "../../interfaces/company/company-payment.interface";
import { BILLING_CYCLES, PaymentMethod, PAYMENT_METHODS, PAYMENT_STATUSES } from "../../constants/domain.constants";

class CompanyPaymentModel extends Model<CompanyPaymentAttributes, CompanyPaymentCreationAttributes>
    implements CompanyPaymentAttributes {
    declare uuid_company_payment: string;
    declare uuid_company: string;
    declare amount: number;
    declare currency: string;
    declare exchange_rate: number | null;
    declare amount_bob: number | null;
    declare payment_method: PaymentMethod | null;
    declare payment_reference?: string | null;
    declare notes?: string | null;
    declare paid_at: Date;
    declare period_start?: Date | null;
    declare period_end?: Date | null;
    declare plan_type: CompanyPaymentAttributes['plan_type'];
    declare max_users: number | null;
    declare max_animals: number | null;
    declare max_activity_records: number | null;
    declare billing_cycle: CompanyPaymentAttributes['billing_cycle'];
    declare status: CompanyPaymentAttributes['status'];
    declare is_active: boolean;
    declare created_at: Date;
    declare updated_at: Date;
}

CompanyPaymentModel.init(
    {
        uuid_company_payment: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        uuid_company: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD',
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(14, 6),
            allowNull: true,
        },
        amount_bob: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
        },
        payment_method: {
            type: DataTypes.ENUM(...PAYMENT_METHODS),
            allowNull: true,
        },
        payment_reference: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        paid_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        period_start: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        period_end: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        plan_type: {
            type: DataTypes.STRING(64),
            allowNull: false,
            defaultValue: 'VRETE_EMPRESARIAL',
        },
        max_users: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        max_animals: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        max_activity_records: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        billing_cycle: {
            type: DataTypes.ENUM(...BILLING_CYCLES),
            allowNull: false,
            defaultValue: 'ANNUAL',
        },
        status: {
            type: DataTypes.ENUM(...PAYMENT_STATUSES),
            allowNull: false,
            defaultValue: 'POSTED',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'company_payments',
        modelName: 'CompanyPayment',
        timestamps: true,
        underscored: true,
    }
);

export default CompanyPaymentModel;
