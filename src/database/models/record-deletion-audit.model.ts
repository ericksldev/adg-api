import { DataTypes, Model, ModelStatic, Optional, Sequelize } from 'sequelize';

export interface RecordDeletionAuditAttributes {
    id: string;
    kind: string;
    label: string;
    reasons: string;
    actor: string;
    deleted_at: Date;
}

type RecordDeletionAuditCreationAttributes = Optional<RecordDeletionAuditAttributes, 'id' | 'deleted_at'>;

export function createRecordDeletionAuditModel(
    sequelize: Sequelize
): ModelStatic<Model<RecordDeletionAuditAttributes, RecordDeletionAuditCreationAttributes>> {
    class RecordDeletionAuditModel extends Model<RecordDeletionAuditAttributes, RecordDeletionAuditCreationAttributes>
        implements RecordDeletionAuditAttributes {
        declare id: string;
        declare kind: string;
        declare label: string;
        declare reasons: string;
        declare actor: string;
        declare deleted_at: Date;
    }

    RecordDeletionAuditModel.init(
        {
            id: {
                type: DataTypes.BIGINT,
                autoIncrement: true,
                primaryKey: true,
            },
            kind: {
                type: DataTypes.CHAR(1),
                allowNull: false,
            },
            label: {
                type: DataTypes.STRING(160),
                allowNull: false,
            },
            reasons: {
                type: DataTypes.STRING(96),
                allowNull: false,
            },
            actor: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            deleted_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            sequelize,
            tableName: 'record_deletion_audits',
            modelName: 'RecordDeletionAudit',
            timestamps: false,
            underscored: true,
        }
    );

    return RecordDeletionAuditModel as ModelStatic<
        Model<RecordDeletionAuditAttributes, RecordDeletionAuditCreationAttributes>
    >;
}
