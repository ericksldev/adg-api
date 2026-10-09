import { Sequelize } from 'sequelize';
import { createRanchModel } from '../models/ranch.model';
import { createAnimalModel } from '../models/animal.model';
import { createAnimalLegacyModel } from '../models/animal-legacy.model';
import { createAnimalWorkSessionModel } from '../models/animal-work-session.model';
import { createCorralWorkSessionModel } from '../models/corral-work-session.model';
import { createWorkSessionPlannedActivityModel } from '../models/work-session-planned-activity.model';
import { createCorralSessionOperationalModels } from '../models/corral-session-operational.models';
import { createOperationalModels } from '../models/animal-operations.models';
import { createRecordDeletionAuditModel } from '../models/record-deletion-audit.model';
import { associateTenantDomainModels, TenantDomainModels } from './tenant-domain-associations';

export function buildTenantModelsForSequelize(sequelize: Sequelize): TenantDomainModels {
    const RanchModel = createRanchModel(sequelize);
    const AnimalModel = createAnimalModel(sequelize);
    const AnimalLegacyModel = createAnimalLegacyModel(sequelize);
    const AnimalWorkSessionModel = createAnimalWorkSessionModel(sequelize);
    const CorralWorkSessionModel = createCorralWorkSessionModel(sequelize);
    const WorkSessionPlannedActivityModel = createWorkSessionPlannedActivityModel(sequelize);
    const corralOps = createCorralSessionOperationalModels(sequelize);
    const ops = createOperationalModels(sequelize);
    const RecordDeletionAuditModel = createRecordDeletionAuditModel(sequelize);
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
    associateTenantDomainModels(merged as TenantDomainModels);
    return merged as TenantDomainModels;
}

export type { TenantDomainModels } from './tenant-domain-associations';
