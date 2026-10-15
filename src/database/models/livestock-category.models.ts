import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

export interface LivestockCategoryModels {
    LivestockCategoryModel: ModelStatic<Model>;
    AnimalCategoryModel: ModelStatic<Model>;
    AnimalCategoryHistoryModel: ModelStatic<Model>;
}

export function createLivestockCategoryModels(sequelize: Sequelize): LivestockCategoryModels {
    class LivestockCategoryModel extends Model {}
    class AnimalCategoryModel extends Model {}
    class AnimalCategoryHistoryModel extends Model {}

    LivestockCategoryModel.init(
        {
            category_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            uuid_company: { type: DataTypes.UUID, allowNull: true },
            system_code: { type: DataTypes.STRING(64), allowNull: true },
            name: { type: DataTypes.STRING(128), allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            category_type: { type: DataTypes.STRING(32), allowNull: false },
            is_system: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        { sequelize, tableName: 'livestock_categories', modelName: 'LivestockCategory', timestamps: true, underscored: true }
    );

    AnimalCategoryModel.init(
        {
            animal_category_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            category_uuid: { type: DataTypes.UUID, allowNull: false },
            uuid_user: { type: DataTypes.UUID, allowNull: true },
            assigned_at: { type: DataTypes.DATE, allowNull: false },
        },
        { sequelize, tableName: 'animal_categories', modelName: 'AnimalCategory', timestamps: true, underscored: true }
    );

    AnimalCategoryHistoryModel.init(
        {
            history_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            category_uuid: { type: DataTypes.UUID, allowNull: false },
            action: { type: DataTypes.STRING(16), allowNull: false },
            effective_at: { type: DataTypes.DATE, allowNull: false },
            recorded_at: { type: DataTypes.DATE, allowNull: false },
            uuid_user: { type: DataTypes.UUID, allowNull: true },
            reason: { type: DataTypes.TEXT, allowNull: true },
        },
        {
            sequelize,
            tableName: 'animal_category_history',
            modelName: 'AnimalCategoryHistory',
            timestamps: false,
            underscored: true,
        }
    );

    return {
        LivestockCategoryModel,
        AnimalCategoryModel,
        AnimalCategoryHistoryModel,
    };
}
