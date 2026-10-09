"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTenantModelsForSequelize = buildTenantModelsForSequelize;
const ranch_model_1 = require("../models/ranch.model");
const animal_model_1 = require("../models/animal.model");
const animal_legacy_model_1 = require("../models/animal-legacy.model");
const animal_work_session_model_1 = require("../models/animal-work-session.model");
const corral_work_session_model_1 = require("../models/corral-work-session.model");
const work_session_planned_activity_model_1 = require("../models/work-session-planned-activity.model");
const corral_session_operational_models_1 = require("../models/corral-session-operational.models");
const animal_operations_models_1 = require("../models/animal-operations.models");
const record_deletion_audit_model_1 = require("../models/record-deletion-audit.model");
const tenant_domain_associations_1 = require("./tenant-domain-associations");
function buildTenantModelsForSequelize(sequelize) {
    const RanchModel = (0, ranch_model_1.createRanchModel)(sequelize);
    const AnimalModel = (0, animal_model_1.createAnimalModel)(sequelize);
    const AnimalLegacyModel = (0, animal_legacy_model_1.createAnimalLegacyModel)(sequelize);
    const AnimalWorkSessionModel = (0, animal_work_session_model_1.createAnimalWorkSessionModel)(sequelize);
    const CorralWorkSessionModel = (0, corral_work_session_model_1.createCorralWorkSessionModel)(sequelize);
    const WorkSessionPlannedActivityModel = (0, work_session_planned_activity_model_1.createWorkSessionPlannedActivityModel)(sequelize);
    const corralOps = (0, corral_session_operational_models_1.createCorralSessionOperationalModels)(sequelize);
    const ops = (0, animal_operations_models_1.createOperationalModels)(sequelize);
    const RecordDeletionAuditModel = (0, record_deletion_audit_model_1.createRecordDeletionAuditModel)(sequelize);
    const merged = {
        RanchModel,
        AnimalModel,
        AnimalLegacyModel,
        AnimalWorkSessionModel,
        CorralWorkSessionModel,
        WorkSessionPlannedActivityModel,
        RecordDeletionAuditModel,
        ...corralOps,
        ...ops,
    };
    (0, tenant_domain_associations_1.associateTenantDomainModels)(merged);
    return merged;
}
