import CompanyModel from './models/company.model';
import UserModel from './models/user.model';
import UserRanchModel from './models/user-ranch.model';
import RanchCompanyRouteModel from './models/ranch-company-route.model';
import CompanyPaymentModel from './models/company-payment.model';
import ReferenceSampleModel from './models/reference-sample.model';
import SaasPlanModel from './models/saas-plan.model';
import SaasPlanLimitModel from './models/saas-plan-limit.model';
import TermsVersionModel from './models/terms-version.model';
import TermsAcceptanceModel from './models/terms-acceptance.model';

CompanyModel.hasMany(UserModel, {
    foreignKey: 'uuid_company',
    as: 'users',
});

UserModel.belongsTo(CompanyModel, {
    foreignKey: 'uuid_company',
    as: 'company',
});

CompanyModel.hasMany(RanchCompanyRouteModel, {
    foreignKey: 'uuid_company',
    as: 'ranch_routes',
});

RanchCompanyRouteModel.belongsTo(CompanyModel, {
    foreignKey: 'uuid_company',
    as: 'company',
});

UserModel.hasMany(UserRanchModel, {
    foreignKey: 'uuid_user',
    as: 'ranch_memberships',
});

UserRanchModel.belongsTo(UserModel, {
    foreignKey: 'uuid_user',
    as: 'user',
});

/**
 * user_ranches.uuid_ranch references operational ranches in the tenant database only logically
 * (no Sequelize cross-database FK). Roles and uuid_company are authoritative in SaaS.
 */

CompanyModel.hasMany(CompanyPaymentModel, {
    foreignKey: 'uuid_company',
    as: 'payments',
});

CompanyPaymentModel.belongsTo(CompanyModel, {
    foreignKey: 'uuid_company',
    as: 'company',
});

CompanyModel.hasMany(ReferenceSampleModel, {
    foreignKey: 'uuid_company',
    as: 'reference_samples',
});

ReferenceSampleModel.belongsTo(CompanyModel, {
    foreignKey: 'uuid_company',
    as: 'company',
});

SaasPlanModel.hasMany(SaasPlanLimitModel, {
    foreignKey: 'uuid_plan',
    as: 'limits',
});

SaasPlanLimitModel.belongsTo(SaasPlanModel, {
    foreignKey: 'uuid_plan',
    as: 'plan',
});

TermsVersionModel.hasMany(TermsAcceptanceModel, {
    foreignKey: 'uuid_terms_version',
    as: 'acceptances',
});

TermsAcceptanceModel.belongsTo(TermsVersionModel, {
    foreignKey: 'uuid_terms_version',
    as: 'terms_version',
});

UserModel.hasMany(TermsAcceptanceModel, {
    foreignKey: 'uuid_user',
    as: 'terms_acceptances',
});

TermsAcceptanceModel.belongsTo(UserModel, {
    foreignKey: 'uuid_user',
    as: 'user',
});

CompanyModel.hasMany(TermsAcceptanceModel, {
    foreignKey: 'uuid_company',
    as: 'terms_acceptances',
});

TermsAcceptanceModel.belongsTo(CompanyModel, {
    foreignKey: 'uuid_company',
    as: 'company',
});
