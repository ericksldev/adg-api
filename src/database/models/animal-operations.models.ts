import { DataTypes, Model, ModelAttributes, ModelStatic, Sequelize } from 'sequelize';

function initOperationalModel<T extends Model>(
    sequelize: Sequelize,
    model: ModelStatic<T>,
    attributes: ModelAttributes,
    tableName: string,
    modelName: string
) {
    model.init(attributes, {
        sequelize,
        timestamps: true,
        underscored: true,
        tableName,
        modelName,
    });
}

export function createOperationalModels(sequelize: Sequelize) {
    class WorkOrderModel extends Model {}
    initOperationalModel(
        sequelize,
        WorkOrderModel,
        {
            work_order_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            work_date: { type: DataTypes.DATE, allowNull: false },
            work_type: { type: DataTypes.STRING, allowNull: false },
            performed_by: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'work_orders',
        'WorkOrder'
    );

    class WorkOrderAnimalModel extends Model {}
    initOperationalModel(
        sequelize,
        WorkOrderAnimalModel,
        {
            work_order_animal_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            work_order_uuid: { type: DataTypes.UUID, allowNull: false },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'work_order_animals',
        'WorkOrderAnimal'
    );

    class MilkingSessionModel extends Model {}
    initOperationalModel(
        sequelize,
        MilkingSessionModel,
        {
            milking_session_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            milking_date: { type: DataTypes.DATE, allowNull: false },
            shift: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'milking_sessions',
        'MilkingSession'
    );

    class MilkRecordModel extends Model {}
    initOperationalModel(
        sequelize,
        MilkRecordModel,
        {
            milk_record_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            milking_session_uuid: { type: DataTypes.UUID, allowNull: false },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            liters_produced: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            milk_quality: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'milk_records',
        'MilkRecord'
    );

    class AnimalPurchaseModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalPurchaseModel,
        {
            animal_purchase_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            purchase_date: { type: DataTypes.DATE, allowNull: false },
            seller_name: { type: DataTypes.STRING, allowNull: true },
            purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
            origin_ranch: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_purchases',
        'AnimalPurchase'
    );

    class AnimalSaleModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalSaleModel,
        {
            animal_sale_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            sale_date: { type: DataTypes.DATE, allowNull: false },
            buyer_name: { type: DataTypes.STRING, allowNull: true },
            sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
            destination: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_sales',
        'AnimalSale'
    );

    class AnimalDisposalModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalDisposalModel,
        {
            animal_disposal_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            disposal_date: { type: DataTypes.DATE, allowNull: false },
            disposal_type: { type: DataTypes.STRING, allowNull: false },
            reason: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_disposals',
        'AnimalDisposal'
    );

    class InventoryItemModel extends Model {}
    initOperationalModel(
        sequelize,
        InventoryItemModel,
        {
            inventory_item_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            name: { type: DataTypes.STRING, allowNull: false },
            category: { type: DataTypes.STRING, allowNull: true },
            quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
            unit_of_measure: { type: DataTypes.STRING, allowNull: false },
            expiration_date: { type: DataTypes.DATE, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'inventory_items',
        'InventoryItem'
    );

    class PregnancyCheckModel extends Model {}
    initOperationalModel(
        sequelize,
        PregnancyCheckModel,
        {
            pregnancy_check_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            female_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            check_date: { type: DataTypes.DATE, allowNull: false },
            result: { type: DataTypes.STRING, allowNull: false },
            estimated_pregnancy_days: { type: DataTypes.INTEGER, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'pregnancy_checks',
        'PregnancyCheck'
    );

    class AbortionModel extends Model {}
    initOperationalModel(
        sequelize,
        AbortionModel,
        {
            abortion_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            female_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            abortion_date: { type: DataTypes.DATE, allowNull: false },
            estimated_pregnancy_month: { type: DataTypes.INTEGER, allowNull: true },
            possible_cause: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'abortions',
        'Abortion'
    );

    class HealthCampaignModel extends Model {}
    initOperationalModel(
        sequelize,
        HealthCampaignModel,
        {
            health_campaign_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            campaign_date: { type: DataTypes.DATE, allowNull: false },
            performed_by: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'health_campaigns',
        'HealthCampaign'
    );

    class HealthCampaignTreatmentModel extends Model {}
    initOperationalModel(
        sequelize,
        HealthCampaignTreatmentModel,
        {
            health_campaign_treatment_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            health_campaign_uuid: { type: DataTypes.UUID, allowNull: false },
            medicine_uuid: { type: DataTypes.UUID, allowNull: false },
            treatment_type: { type: DataTypes.STRING, allowNull: true },
            dose: { type: DataTypes.STRING, allowNull: true },
            application_method: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'health_campaign_treatments',
        'HealthCampaignTreatment'
    );

    class HealthCampaignAnimalModel extends Model {}
    initOperationalModel(
        sequelize,
        HealthCampaignAnimalModel,
        {
            health_campaign_animal_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            health_campaign_uuid: { type: DataTypes.UUID, allowNull: false },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'health_campaign_animals',
        'HealthCampaignAnimal'
    );

    class MedicineModel extends Model {}
    initOperationalModel(
        sequelize,
        MedicineModel,
        {
            medicine_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            name: { type: DataTypes.STRING, allowNull: false },
            medicine_type: { type: DataTypes.STRING, allowNull: true },
            batch_number: { type: DataTypes.STRING, allowNull: true },
            expiration_date: { type: DataTypes.DATE, allowNull: true },
            supplier: { type: DataTypes.STRING, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'medicines',
        'Medicine'
    );

    class InseminationModel extends Model {}
    initOperationalModel(
        sequelize,
        InseminationModel,
        {
            insemination_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            female_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            insemination_date: { type: DataTypes.DATE, allowNull: false },
            semen_code: { type: DataTypes.STRING, allowNull: true },
            bull_name: { type: DataTypes.STRING, allowNull: true },
            bull_breed: { type: DataTypes.STRING, allowNull: true },
            semen_supplier: { type: DataTypes.STRING, allowNull: true },
            technician_name: { type: DataTypes.STRING, allowNull: true },
            insemination_method: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'inseminations',
        'Insemination'
    );

    class NaturalBreedingSeasonModel extends Model {}
    initOperationalModel(
        sequelize,
        NaturalBreedingSeasonModel,
        {
            natural_breeding_season_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            season_name: { type: DataTypes.STRING, allowNull: false },
            start_date: { type: DataTypes.DATE, allowNull: false },
            end_date: { type: DataTypes.DATE, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'natural_breeding_seasons',
        'NaturalBreedingSeason'
    );

    class NaturalBreedingBullModel extends Model {}
    initOperationalModel(
        sequelize,
        NaturalBreedingBullModel,
        {
            natural_breeding_bull_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            natural_breeding_season_uuid: { type: DataTypes.UUID, allowNull: false },
            bull_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'natural_breeding_bulls',
        'NaturalBreedingBull'
    );

    class NaturalBreedingFemaleModel extends Model {}
    initOperationalModel(
        sequelize,
        NaturalBreedingFemaleModel,
        {
            natural_breeding_female_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            natural_breeding_season_uuid: { type: DataTypes.UUID, allowNull: false },
            female_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'natural_breeding_females',
        'NaturalBreedingFemale'
    );

    class RanchProductionTypeModel extends Model {}
    initOperationalModel(
        sequelize,
        RanchProductionTypeModel,
        {
            ranch_production_type_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            production_type: { type: DataTypes.STRING, allowNull: false },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'ranch_production_types',
        'RanchProductionType'
    );

    class PaddockModel extends Model {}
    initOperationalModel(
        sequelize,
        PaddockModel,
        {
            paddock_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            name: { type: DataTypes.STRING, allowNull: false },
            size_in_hectares: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
            grass_type: { type: DataTypes.STRING, allowNull: true },
            water_source: { type: DataTypes.STRING, allowNull: true },
            maximum_capacity: { type: DataTypes.INTEGER, allowNull: true },
            status: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'paddocks',
        'Paddock'
    );

    class AnimalMovementModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalMovementModel,
        {
            animal_movement_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            origin_paddock_uuid: { type: DataTypes.UUID, allowNull: true },
            destination_paddock_uuid: { type: DataTypes.UUID, allowNull: true },
            movement_date: { type: DataTypes.DATE, allowNull: false },
            movement_reason: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            uuid_corral_work_session: { type: DataTypes.UUID, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_movements',
        'AnimalMovement'
    );

    class OwnerModel extends Model {}
    initOperationalModel(
        sequelize,
        OwnerModel,
        {
            owner_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            full_name: { type: DataTypes.STRING, allowNull: false },
            document_number: { type: DataTypes.STRING, allowNull: true },
            phone_number: { type: DataTypes.STRING, allowNull: true },
            email: { type: DataTypes.STRING, allowNull: true },
            address: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'owners',
        'Owner'
    );

    class AnimalOwnerTransferModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalOwnerTransferModel,
        {
            animal_owner_transfer_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            previous_owner_uuid: { type: DataTypes.UUID, allowNull: true },
            new_owner_uuid: { type: DataTypes.UUID, allowNull: true },
            transfer_date: { type: DataTypes.DATE, allowNull: false },
            transfer_reason: { type: DataTypes.STRING, allowNull: true },
            sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
            currency: { type: DataTypes.STRING(3), allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_owner_transfers',
        'AnimalOwnerTransfer'
    );

    class AnimalIdentificationModel extends Model {}
    initOperationalModel(
        sequelize,
        AnimalIdentificationModel,
        {
            animal_identification_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            ranch_uuid: { type: DataTypes.UUID, allowNull: false },
            identification_type: {
                type: DataTypes.ENUM(
                    'ear_tag',
                    'rfid',
                    'brand',
                    'tattoo',
                    'temporary_birth_mark',
                    'visual_identifier'
                ),
                allowNull: false,
            },
            identification_number: { type: DataTypes.STRING, allowNull: false },
            is_temporary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            assigned_date: { type: DataTypes.DATE, allowNull: false },
            expiration_date: { type: DataTypes.DATE, allowNull: true },
            status: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'animal_identifications',
        'AnimalIdentification'
    );

    class WeightRecordModel extends Model {}
    initOperationalModel(
        sequelize,
        WeightRecordModel,
        {
            weight_record_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            animal_uuid: { type: DataTypes.UUID, allowNull: false },
            weight: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
            weight_date: { type: DataTypes.DATE, allowNull: false },
            animal_age_in_days: { type: DataTypes.INTEGER, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'weight_records',
        'WeightRecord'
    );

    class BirthModel extends Model {}
    initOperationalModel(
        sequelize,
        BirthModel,
        {
            birth_uuid: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            mother_animal_uuid: { type: DataTypes.UUID, allowNull: false },
            father_animal_uuid: { type: DataTypes.UUID, allowNull: true },
            newborn_animal_uuid: { type: DataTypes.UUID, allowNull: true },
            birth_date: { type: DataTypes.DATE, allowNull: false },
            birth_weight: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
            sex: { type: DataTypes.STRING, allowNull: true },
            birth_type: { type: DataTypes.STRING, allowNull: true },
            birth_status: { type: DataTypes.STRING, allowNull: true },
            temporary_identifier: { type: DataTypes.STRING, allowNull: true },
            description: { type: DataTypes.TEXT, allowNull: true },
            is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        },
        'births',
        'Birth'
    );

    return {
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
    };
}

export type OperationalModelsBundle = ReturnType<typeof createOperationalModels>;
