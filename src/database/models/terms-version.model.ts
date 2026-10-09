import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database';
import {
    TermsVersionAttributes,
    TermsVersionCreationAttributes,
} from '../../interfaces/terms/terms.interface';

class TermsVersionModel extends Model<TermsVersionAttributes, TermsVersionCreationAttributes>
    implements TermsVersionAttributes {
    declare uuid_terms_version: string;
    declare version: string;
    declare title: string;
    declare content: string;
    declare effective_at: Date;
    declare is_active: boolean;
    declare requires_acceptance: boolean;
    declare created_at: Date;
    declare updated_at: Date;
}

TermsVersionModel.init(
    {
        uuid_terms_version: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        version: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        effective_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        requires_acceptance: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        sequelize,
        tableName: 'terms_versions',
        modelName: 'TermsVersion',
        timestamps: true,
        underscored: true,
    }
);

export default TermsVersionModel;
