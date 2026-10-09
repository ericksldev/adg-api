"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRecordDeletionAuditModel = createRecordDeletionAuditModel;
const sequelize_1 = require("sequelize");
function createRecordDeletionAuditModel(sequelize) {
    class RecordDeletionAuditModel extends sequelize_1.Model {
    }
    RecordDeletionAuditModel.init({
        id: {
            type: sequelize_1.DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true,
        },
        kind: {
            type: sequelize_1.DataTypes.CHAR(1),
            allowNull: false,
        },
        label: {
            type: sequelize_1.DataTypes.STRING(160),
            allowNull: false,
        },
        reasons: {
            type: sequelize_1.DataTypes.STRING(96),
            allowNull: false,
        },
        actor: {
            type: sequelize_1.DataTypes.STRING(64),
            allowNull: false,
        },
        deleted_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        sequelize,
        tableName: 'record_deletion_audits',
        modelName: 'RecordDeletionAudit',
        timestamps: false,
        underscored: true,
    });
    return RecordDeletionAuditModel;
}
