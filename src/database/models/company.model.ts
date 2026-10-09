import { Model, DataTypes } from 'sequelize';
import sequelize from '../../database';
import {CompanyAttributes, CompanyCreationAttributes} from "../../interfaces/company/company.interface";
import { BILLING_CYCLES, MEMBERSHIP_STATUSES } from '../../constants/domain.constants';

class CompanyModel extends Model <CompanyAttributes, CompanyCreationAttributes>
    implements CompanyAttributes {
    declare uuid_company: string;
    declare name: string;
    declare legal_name?: string;
    declare tax_id?: string;
    declare plan_type: CompanyAttributes['plan_type'];
    declare max_users: number | null;
    declare max_animals: number | null;
    declare max_activity_records: number | null;
    declare billing_cycle: CompanyAttributes['billing_cycle'];
    declare membership_status: CompanyAttributes['membership_status'];
    declare membership_started_at?: Date | null;
    declare membership_renewal_at?: Date | null;
    declare tenant_database?: string | null;
    declare tenant_schema_version?: number | null;
    declare is_active: boolean;
    declare created_at: Date;
    declare updated_at: Date;
}

CompanyModel.init(
    {
        uuid_company: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        legal_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        tax_id: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
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
        membership_status: {
            type: DataTypes.ENUM(...MEMBERSHIP_STATUSES),
            allowNull: false,
            defaultValue: 'CANCELLED',
        },
        membership_started_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        membership_renewal_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        tenant_database: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        tenant_schema_version: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false,
        }
    },
    {
        sequelize,
        tableName: 'companies',
        modelName: 'Company',
        timestamps: true,
        underscored: true,
    }
);

export default CompanyModel;
