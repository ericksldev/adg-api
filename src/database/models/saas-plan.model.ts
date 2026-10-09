import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database';
import { SaasPlanAttributes, SaasPlanCreationAttributes } from '../../interfaces/saas-plan/saas-plan.interface';

class SaasPlanModel extends Model<SaasPlanAttributes, SaasPlanCreationAttributes> implements SaasPlanAttributes {
    declare uuid_plan: string;
    declare code: string;
    declare name: string;
    declare description: string | null;
    declare annual_price: number;
    declare currency: string;
    declare is_active: boolean;
    declare created_at: Date;
    declare updated_at: Date;
}

SaasPlanModel.init(
    {
        uuid_plan: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        code: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING(160),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        annual_price: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD',
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'saas_plans',
        modelName: 'SaasPlan',
        timestamps: true,
        underscored: true,
    }
);

export default SaasPlanModel;
