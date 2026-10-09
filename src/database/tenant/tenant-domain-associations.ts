import type { Model, ModelStatic } from 'sequelize';
import type { OperationalModelsBundle } from '../models/animal-operations.models';

export type TenantDomainModels = OperationalModelsBundle & {
    RanchModel: ModelStatic<Model>;
    AnimalModel: ModelStatic<Model>;
    AnimalLegacyModel: ModelStatic<Model>;
    AnimalWorkSessionModel: ModelStatic<Model>;
    CorralWorkSessionModel: ModelStatic<Model>;
    WorkSessionPlannedActivityModel: ModelStatic<Model>;
    CorralSessionStepModel: ModelStatic<Model>;
    CorralStepActivityModel: ModelStatic<Model>;
    CorralSessionSourceModel: ModelStatic<Model>;
    CorralSessionAnimalModel: ModelStatic<Model>;
    CorralStepAnimalModel: ModelStatic<Model>;
    CorralActivityRecordModel: ModelStatic<Model>;
    CorralAnimalObservationModel: ModelStatic<Model>;
    CorralAnimalVisualConditionModel: ModelStatic<Model>;
    CorralAnimalAdditionalMedicationModel: ModelStatic<Model>;
    CorralAnimalAdditionalTreatmentModel: ModelStatic<Model>;
    CorralUnregisteredStepRowModel: ModelStatic<Model>;
    RecordDeletionAuditModel: ModelStatic<Model>;
};

export function associateTenantDomainModels(m: TenantDomainModels): void {
    const {
        RanchModel,
        AnimalModel,
        AnimalLegacyModel,
        CorralWorkSessionModel,
        WorkSessionPlannedActivityModel,
        CorralSessionStepModel,
        CorralStepActivityModel,
        CorralSessionSourceModel,
        CorralSessionAnimalModel,
        CorralStepAnimalModel,
        CorralActivityRecordModel,
        CorralAnimalObservationModel,
        CorralAnimalVisualConditionModel,
        CorralAnimalAdditionalMedicationModel,
        CorralAnimalAdditionalTreatmentModel,
        AnimalWorkSessionModel,
        WorkOrderModel,
        WorkOrderAnimalModel,
        MilkingSessionModel,
        MilkRecordModel,
        AnimalPurchaseModel,
        AnimalSaleModel,
        AnimalDisposalModel,
        InventoryItemModel,
        PregnancyCheckModel,
        AbortionModel,
        HealthCampaignModel,
        HealthCampaignTreatmentModel,
        HealthCampaignAnimalModel,
        MedicineModel,
        InseminationModel,
        NaturalBreedingSeasonModel,
        NaturalBreedingBullModel,
        NaturalBreedingFemaleModel,
        RanchProductionTypeModel,
        PaddockModel,
        AnimalMovementModel,
        OwnerModel,
        AnimalOwnerTransferModel,
        AnimalIdentificationModel,
        WeightRecordModel,
        BirthModel,
    } = m;

    RanchModel.hasMany(AnimalModel, {
        foreignKey: 'ranch_uuid',
        as: 'animals',
    });

    AnimalModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    AnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'mother_animal_uuid',
        as: 'mother',
    });

    AnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'father_animal_uuid',
        as: 'father',
    });

    AnimalModel.hasMany(AnimalModel, {
        foreignKey: 'mother_animal_uuid',
        as: 'children_as_mother',
    });

    AnimalModel.hasMany(AnimalModel, {
        foreignKey: 'father_animal_uuid',
        as: 'children_as_father',
    });

    OwnerModel.hasMany(AnimalModel, {
        foreignKey: 'current_owner_uuid',
        as: 'owned_animals',
    });

    AnimalModel.belongsTo(OwnerModel, {
        foreignKey: 'current_owner_uuid',
        as: 'current_owner',
    });

    PaddockModel.hasMany(AnimalModel, {
        foreignKey: 'current_paddock_uuid',
        as: 'current_animals',
    });

    AnimalModel.belongsTo(PaddockModel, {
        foreignKey: 'current_paddock_uuid',
        as: 'current_paddock',
    });

    RanchModel.hasMany(AnimalLegacyModel, {
        foreignKey: 'uuid_location',
        as: 'legacy_animals',
    });

    AnimalLegacyModel.belongsTo(RanchModel, {
        foreignKey: 'uuid_location',
        as: 'ranch',
    });

    RanchModel.hasMany(WorkOrderModel, {
        foreignKey: 'ranch_uuid',
        as: 'work_orders',
    });

    WorkOrderModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    WorkOrderModel.hasMany(WorkOrderAnimalModel, {
        foreignKey: 'work_order_uuid',
        as: 'work_order_animals',
    });

    WorkOrderAnimalModel.belongsTo(WorkOrderModel, {
        foreignKey: 'work_order_uuid',
        as: 'work_order',
    });

    AnimalModel.hasMany(WorkOrderAnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'work_orders_links',
    });

    WorkOrderAnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    RanchModel.hasMany(MilkingSessionModel, {
        foreignKey: 'ranch_uuid',
        as: 'milking_sessions',
    });

    MilkingSessionModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    MilkingSessionModel.hasMany(MilkRecordModel, {
        foreignKey: 'milking_session_uuid',
        as: 'milk_records',
    });

    MilkRecordModel.belongsTo(MilkingSessionModel, {
        foreignKey: 'milking_session_uuid',
        as: 'milking_session',
    });

    AnimalModel.hasMany(MilkRecordModel, {
        foreignKey: 'animal_uuid',
        as: 'milk_records',
    });

    MilkRecordModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    AnimalModel.hasMany(AnimalPurchaseModel, {
        foreignKey: 'animal_uuid',
        as: 'purchases',
    });

    AnimalPurchaseModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    AnimalModel.hasMany(AnimalSaleModel, {
        foreignKey: 'animal_uuid',
        as: 'sales',
    });

    AnimalSaleModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    AnimalModel.hasMany(AnimalDisposalModel, {
        foreignKey: 'animal_uuid',
        as: 'disposals',
    });

    AnimalDisposalModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    RanchModel.hasMany(InventoryItemModel, {
        foreignKey: 'ranch_uuid',
        as: 'inventory_items',
    });

    InventoryItemModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    RanchModel.hasMany(NaturalBreedingSeasonModel, {
        foreignKey: 'ranch_uuid',
        as: 'natural_breeding_seasons',
    });

    NaturalBreedingSeasonModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    NaturalBreedingSeasonModel.hasMany(NaturalBreedingBullModel, {
        foreignKey: 'natural_breeding_season_uuid',
        as: 'bulls',
    });

    NaturalBreedingBullModel.belongsTo(NaturalBreedingSeasonModel, {
        foreignKey: 'natural_breeding_season_uuid',
        as: 'season',
    });

    NaturalBreedingSeasonModel.hasMany(NaturalBreedingFemaleModel, {
        foreignKey: 'natural_breeding_season_uuid',
        as: 'females',
    });

    NaturalBreedingFemaleModel.belongsTo(NaturalBreedingSeasonModel, {
        foreignKey: 'natural_breeding_season_uuid',
        as: 'season',
    });

    AnimalModel.hasMany(NaturalBreedingBullModel, {
        foreignKey: 'bull_animal_uuid',
        as: 'natural_breeding_seasons_as_bull',
    });

    NaturalBreedingBullModel.belongsTo(AnimalModel, {
        foreignKey: 'bull_animal_uuid',
        as: 'bull',
    });

    AnimalModel.hasMany(NaturalBreedingFemaleModel, {
        foreignKey: 'female_animal_uuid',
        as: 'natural_breeding_seasons_as_female',
    });

    NaturalBreedingFemaleModel.belongsTo(AnimalModel, {
        foreignKey: 'female_animal_uuid',
        as: 'female',
    });

    AnimalModel.hasMany(PregnancyCheckModel, {
        foreignKey: 'female_animal_uuid',
        as: 'pregnancy_checks',
    });

    PregnancyCheckModel.belongsTo(AnimalModel, {
        foreignKey: 'female_animal_uuid',
        as: 'female_animal',
    });

    AnimalModel.hasMany(AbortionModel, {
        foreignKey: 'female_animal_uuid',
        as: 'abortions',
    });

    AbortionModel.belongsTo(AnimalModel, {
        foreignKey: 'female_animal_uuid',
        as: 'female_animal',
    });

    RanchModel.hasMany(HealthCampaignModel, {
        foreignKey: 'ranch_uuid',
        as: 'health_campaigns',
    });

    HealthCampaignModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    HealthCampaignModel.hasMany(HealthCampaignTreatmentModel, {
        foreignKey: 'health_campaign_uuid',
        as: 'treatments',
    });

    HealthCampaignTreatmentModel.belongsTo(HealthCampaignModel, {
        foreignKey: 'health_campaign_uuid',
        as: 'health_campaign',
    });

    MedicineModel.hasMany(HealthCampaignTreatmentModel, {
        foreignKey: 'medicine_uuid',
        as: 'campaign_treatments',
    });

    HealthCampaignTreatmentModel.belongsTo(MedicineModel, {
        foreignKey: 'medicine_uuid',
        as: 'medicine',
    });

    HealthCampaignModel.hasMany(HealthCampaignAnimalModel, {
        foreignKey: 'health_campaign_uuid',
        as: 'animals',
    });

    HealthCampaignAnimalModel.belongsTo(HealthCampaignModel, {
        foreignKey: 'health_campaign_uuid',
        as: 'health_campaign',
    });

    AnimalModel.hasMany(HealthCampaignAnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'health_campaigns_links',
    });

    HealthCampaignAnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    AnimalModel.hasMany(InseminationModel, {
        foreignKey: 'female_animal_uuid',
        as: 'inseminations',
    });

    InseminationModel.belongsTo(AnimalModel, {
        foreignKey: 'female_animal_uuid',
        as: 'female_animal',
    });

    RanchModel.hasMany(RanchProductionTypeModel, {
        foreignKey: 'ranch_uuid',
        as: 'production_types',
    });

    RanchProductionTypeModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    RanchModel.hasMany(PaddockModel, {
        foreignKey: 'ranch_uuid',
        as: 'paddocks',
    });

    PaddockModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    AnimalModel.hasMany(AnimalMovementModel, {
        foreignKey: 'animal_uuid',
        as: 'movements',
    });

    AnimalMovementModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    PaddockModel.hasMany(AnimalMovementModel, {
        foreignKey: 'origin_paddock_uuid',
        as: 'origin_movements',
    });

    AnimalMovementModel.belongsTo(PaddockModel, {
        foreignKey: 'origin_paddock_uuid',
        as: 'origin_paddock',
    });

    PaddockModel.hasMany(AnimalMovementModel, {
        foreignKey: 'destination_paddock_uuid',
        as: 'destination_movements',
    });

    AnimalMovementModel.belongsTo(PaddockModel, {
        foreignKey: 'destination_paddock_uuid',
        as: 'destination_paddock',
    });

    AnimalModel.hasMany(AnimalOwnerTransferModel, {
        foreignKey: 'animal_uuid',
        as: 'owner_transfers',
    });

    AnimalOwnerTransferModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    OwnerModel.hasMany(AnimalOwnerTransferModel, {
        foreignKey: 'previous_owner_uuid',
        as: 'transfers_as_previous_owner',
    });

    AnimalOwnerTransferModel.belongsTo(OwnerModel, {
        foreignKey: 'previous_owner_uuid',
        as: 'previous_owner',
    });

    OwnerModel.hasMany(AnimalOwnerTransferModel, {
        foreignKey: 'new_owner_uuid',
        as: 'transfers_as_new_owner',
    });

    AnimalOwnerTransferModel.belongsTo(OwnerModel, {
        foreignKey: 'new_owner_uuid',
        as: 'new_owner',
    });

    AnimalModel.hasMany(AnimalIdentificationModel, {
        foreignKey: 'animal_uuid',
        as: 'identifications',
    });

    AnimalIdentificationModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    RanchModel.hasMany(AnimalIdentificationModel, {
        foreignKey: 'ranch_uuid',
        as: 'animal_identifications',
    });

    AnimalIdentificationModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    AnimalModel.hasMany(WeightRecordModel, {
        foreignKey: 'animal_uuid',
        as: 'weight_records',
    });

    WeightRecordModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    AnimalModel.hasMany(BirthModel, {
        foreignKey: 'mother_animal_uuid',
        as: 'births_as_mother',
    });

    BirthModel.belongsTo(AnimalModel, {
        foreignKey: 'mother_animal_uuid',
        as: 'mother_animal',
    });

    AnimalModel.hasMany(BirthModel, {
        foreignKey: 'father_animal_uuid',
        as: 'births_as_father',
    });

    BirthModel.belongsTo(AnimalModel, {
        foreignKey: 'father_animal_uuid',
        as: 'father_animal',
    });

    AnimalModel.hasMany(BirthModel, {
        foreignKey: 'newborn_animal_uuid',
        as: 'birth_events_as_newborn',
    });

    BirthModel.belongsTo(AnimalModel, {
        foreignKey: 'newborn_animal_uuid',
        as: 'newborn_animal',
    });

    RanchModel.hasMany(CorralWorkSessionModel, {
        foreignKey: 'ranch_uuid',
        as: 'corral_work_sessions',
    });

    CorralWorkSessionModel.belongsTo(RanchModel, {
        foreignKey: 'ranch_uuid',
        as: 'ranch',
    });

    PaddockModel.hasMany(CorralWorkSessionModel, {
        foreignKey: 'paddock_uuid',
        as: 'corral_work_sessions',
    });

    CorralWorkSessionModel.belongsTo(PaddockModel, {
        foreignKey: 'paddock_uuid',
        as: 'paddock',
    });

    CorralWorkSessionModel.hasMany(WorkSessionPlannedActivityModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'planned_activities',
    });

    WorkSessionPlannedActivityModel.belongsTo(CorralWorkSessionModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'corral_work_session',
    });

    CorralWorkSessionModel.hasMany(AnimalWorkSessionModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'animal_records',
    });

    AnimalWorkSessionModel.belongsTo(CorralWorkSessionModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'corral_work_session',
    });

    AnimalModel.hasMany(AnimalWorkSessionModel, {
        foreignKey: 'uuid_animal',
        as: 'corral_work_records',
    });

    AnimalWorkSessionModel.belongsTo(AnimalModel, {
        foreignKey: 'uuid_animal',
        as: 'animal',
    });

    CorralWorkSessionModel.hasMany(CorralSessionStepModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'steps',
    });
    CorralSessionStepModel.belongsTo(CorralWorkSessionModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'corral_work_session',
    });

    CorralSessionStepModel.hasMany(CorralStepActivityModel, {
        foreignKey: 'uuid_corral_session_step',
        as: 'activities',
    });
    CorralStepActivityModel.belongsTo(CorralSessionStepModel, {
        foreignKey: 'uuid_corral_session_step',
        as: 'step',
    });

    CorralWorkSessionModel.hasMany(CorralSessionSourceModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'sources',
    });
    CorralWorkSessionModel.hasMany(CorralSessionAnimalModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'session_animals',
    });
    CorralSessionAnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    CorralSessionStepModel.hasMany(CorralStepAnimalModel, {
        foreignKey: 'uuid_corral_session_step',
        as: 'step_animals',
    });
    CorralStepAnimalModel.belongsTo(CorralSessionStepModel, {
        foreignKey: 'uuid_corral_session_step',
        as: 'step',
    });
    CorralStepAnimalModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });

    CorralWorkSessionModel.hasMany(CorralActivityRecordModel, {
        foreignKey: 'uuid_corral_work_session',
        as: 'activity_records',
    });
    CorralActivityRecordModel.belongsTo(CorralSessionStepModel, {
        foreignKey: 'uuid_corral_session_step',
        as: 'step',
    });
    CorralActivityRecordModel.belongsTo(AnimalModel, {
        foreignKey: 'animal_uuid',
        as: 'animal',
    });
}
