"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../../database"));
class SaasPlanLimitModel extends sequelize_1.Model {
}
SaasPlanLimitModel.init({
    uuid_plan: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'saas_plans',
            key: 'uuid_plan',
        },
        onDelete: 'CASCADE',
    },
    resource_code: {
        type: sequelize_1.DataTypes.STRING(64),
        allowNull: false,
        primaryKey: true,
    },
    max_value: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize: database_1.default,
    tableName: 'saas_plan_limits',
    modelName: 'SaasPlanLimit',
    timestamps: false,
    underscored: true,
});
exports.default = SaasPlanLimitModel;
