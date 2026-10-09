import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database';
import { SaasPlanLimitAttributes } from '../../interfaces/saas-plan/saas-plan.interface';

class SaasPlanLimitModel extends Model<SaasPlanLimitAttributes, SaasPlanLimitAttributes>
    implements SaasPlanLimitAttributes {
    declare uuid_plan: string;
    declare resource_code: string;
    declare max_value: number;
}

SaasPlanLimitModel.init(
    {
        uuid_plan: {
            type: DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            references: {
                model: 'saas_plans',
                key: 'uuid_plan',
            },
            onDelete: 'CASCADE',
        },
        resource_code: {
            type: DataTypes.STRING(64),
            allowNull: false,
            primaryKey: true,
        },
        max_value: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        sequelize,
        tableName: 'saas_plan_limits',
        modelName: 'SaasPlanLimit',
        timestamps: false,
        underscored: true,
    }
);

export default SaasPlanLimitModel;
