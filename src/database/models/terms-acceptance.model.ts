import { DataTypes, Model } from 'sequelize';
import sequelize from '../../database';
import {
    TermsAcceptanceAttributes,
    TermsAcceptanceCreationAttributes,
} from '../../interfaces/terms/terms.interface';

class TermsAcceptanceModel extends Model<TermsAcceptanceAttributes, TermsAcceptanceCreationAttributes>
    implements TermsAcceptanceAttributes {
    declare uuid_terms_acceptance: string;
    declare uuid_user: string;
    declare uuid_company: string;
    declare uuid_terms_version: string;
    declare accepted_at: Date;
    declare ip_address: string | null;
    declare user_agent: string | null;
    declare created_at: Date;
    declare updated_at: Date;
}

TermsAcceptanceModel.init(
    {
        uuid_terms_acceptance: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        uuid_user: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        uuid_company: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        uuid_terms_version: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        accepted_at: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        ip_address: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        user_agent: {
            type: DataTypes.STRING(512),
            allowNull: true,
        },
    },
    {
        sequelize,
        tableName: 'terms_acceptances',
        modelName: 'TermsAcceptance',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                name: 'terms_acceptances_user_company_version_uk',
                unique: true,
                fields: ['uuid_user', 'uuid_company', 'uuid_terms_version'],
            },
            {
                name: 'terms_acceptances_company_user_idx',
                fields: ['uuid_company', 'uuid_user'],
            },
        ],
    }
);

export default TermsAcceptanceModel;
