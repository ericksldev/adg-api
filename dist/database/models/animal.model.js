"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnimalModel = createAnimalModel;
const sequelize_1 = require("sequelize");
function createAnimalModel(sequelize) {
    class AnimalModel extends sequelize_1.Model {
    }
    AnimalModel.init({
        animal_uuid: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
        },
        ranch_uuid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        breed_code: {
            type: sequelize_1.DataTypes.STRING(64),
            allowNull: true,
        },
        registration_number: {
            type: sequelize_1.DataTypes.STRING(128),
            allowNull: false,
        },
        chip_number: {
            type: sequelize_1.DataTypes.STRING(128),
            allowNull: true,
        },
        mother_animal_uuid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        father_animal_uuid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        current_owner_uuid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        sex: {
            type: sequelize_1.DataTypes.ENUM('MALE', 'FEMALE'),
            allowNull: false,
            defaultValue: 'MALE',
        },
        color: {
            type: sequelize_1.DataTypes.STRING,
            allowNull: true,
        },
        birth_date: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
        },
        origin_type: {
            type: sequelize_1.DataTypes.ENUM('BIRTH', 'PURCHASE', 'TRANSFER', 'UNKNOWN'),
            allowNull: false,
            defaultValue: 'UNKNOWN',
        },
        current_status: {
            type: sequelize_1.DataTypes.ENUM('ACTIVE', 'SOLD', 'DISPOSED', 'DEAD', 'MISSING', 'INACTIVE'),
            allowNull: false,
            defaultValue: 'ACTIVE',
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        current_paddock_uuid: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        is_active: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    }, {
        sequelize,
        tableName: 'animals',
        modelName: 'Animal',
        timestamps: true,
        underscored: true,
    });
    return AnimalModel;
}
