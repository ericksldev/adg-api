"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOperationalModels = createOperationalModels;
const sequelize_1 = require("sequelize");
function initOperationalModel(sequelize, model, attributes, tableName, modelName) {
    model.init(attributes, {
        sequelize,
        timestamps: true,
        underscored: true,
        tableName,
        modelName,
    });
}
function createOperationalModels(sequelize) {
    class WorkOrderModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, WorkOrderModel, {
        work_order_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        work_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        work_type: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        performed_by: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'work_orders', 'WorkOrder');
    class WorkOrderAnimalModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, WorkOrderAnimalModel, {
        work_order_animal_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        work_order_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'work_order_animals', 'WorkOrderAnimal');
    class MilkingSessionModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, MilkingSessionModel, {
        milking_session_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        milking_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        shift: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'milking_sessions', 'MilkingSession');
    class MilkRecordModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, MilkRecordModel, {
        milk_record_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        milking_session_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        liters_produced: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
        milk_quality: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'milk_records', 'MilkRecord');
    class AnimalPurchaseModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalPurchaseModel, {
        animal_purchase_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        purchase_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        seller_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        purchase_price: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: false },
        currency: { type: sequelize_1.DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
        origin_ranch: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_purchases', 'AnimalPurchase');
    class AnimalSaleModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalSaleModel, {
        animal_sale_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        sale_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        buyer_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        sale_price: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: false },
        currency: { type: sequelize_1.DataTypes.STRING(3), allowNull: false, defaultValue: 'USD' },
        destination: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_sales', 'AnimalSale');
    class AnimalDisposalModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalDisposalModel, {
        animal_disposal_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        disposal_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        disposal_type: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        reason: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_disposals', 'AnimalDisposal');
    class InventoryItemModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, InventoryItemModel, {
        inventory_item_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        category: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        quantity: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: false },
        unit_of_measure: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        expiration_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'inventory_items', 'InventoryItem');
    class PregnancyCheckModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, PregnancyCheckModel, {
        pregnancy_check_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        female_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        check_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        result: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        estimated_pregnancy_days: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'pregnancy_checks', 'PregnancyCheck');
    class AbortionModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AbortionModel, {
        abortion_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        female_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        abortion_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        estimated_pregnancy_month: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
        possible_cause: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'abortions', 'Abortion');
    class HealthCampaignModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, HealthCampaignModel, {
        health_campaign_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        campaign_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        performed_by: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'health_campaigns', 'HealthCampaign');
    class HealthCampaignTreatmentModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, HealthCampaignTreatmentModel, {
        health_campaign_treatment_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        health_campaign_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        medicine_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        treatment_type: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        dose: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        application_method: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'health_campaign_treatments', 'HealthCampaignTreatment');
    class HealthCampaignAnimalModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, HealthCampaignAnimalModel, {
        health_campaign_animal_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        health_campaign_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'health_campaign_animals', 'HealthCampaignAnimal');
    class MedicineModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, MedicineModel, {
        medicine_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        medicine_type: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        batch_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        expiration_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        supplier: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'medicines', 'Medicine');
    class InseminationModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, InseminationModel, {
        insemination_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        female_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        insemination_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        semen_code: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        bull_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        bull_breed: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        semen_supplier: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        technician_name: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        insemination_method: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'inseminations', 'Insemination');
    class NaturalBreedingSeasonModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, NaturalBreedingSeasonModel, {
        natural_breeding_season_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        season_name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        start_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        end_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'natural_breeding_seasons', 'NaturalBreedingSeason');
    class NaturalBreedingBullModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, NaturalBreedingBullModel, {
        natural_breeding_bull_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        natural_breeding_season_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        bull_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'natural_breeding_bulls', 'NaturalBreedingBull');
    class NaturalBreedingFemaleModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, NaturalBreedingFemaleModel, {
        natural_breeding_female_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        natural_breeding_season_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        female_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'natural_breeding_females', 'NaturalBreedingFemale');
    class RanchProductionTypeModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, RanchProductionTypeModel, {
        ranch_production_type_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        production_type: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'ranch_production_types', 'RanchProductionType');
    class PaddockModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, PaddockModel, {
        paddock_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        size_in_hectares: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: true },
        grass_type: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        water_source: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        maximum_capacity: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
        status: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'paddocks', 'Paddock');
    class AnimalMovementModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalMovementModel, {
        animal_movement_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        origin_paddock_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        destination_paddock_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        movement_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        movement_reason: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_movements', 'AnimalMovement');
    class OwnerModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, OwnerModel, {
        owner_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        full_name: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        document_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        phone_number: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        email: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        address: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'owners', 'Owner');
    class AnimalOwnerTransferModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalOwnerTransferModel, {
        animal_owner_transfer_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        previous_owner_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        new_owner_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        transfer_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        transfer_reason: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        sale_price: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: true },
        currency: { type: sequelize_1.DataTypes.STRING(3), allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_owner_transfers', 'AnimalOwnerTransfer');
    class AnimalIdentificationModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, AnimalIdentificationModel, {
        animal_identification_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        ranch_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        identification_type: {
            type: sequelize_1.DataTypes.ENUM('ear_tag', 'rfid', 'brand', 'tattoo', 'temporary_birth_mark', 'visual_identifier'),
            allowNull: false,
        },
        identification_number: { type: sequelize_1.DataTypes.STRING, allowNull: false },
        is_temporary: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        assigned_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        expiration_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        status: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'animal_identifications', 'AnimalIdentification');
    class WeightRecordModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, WeightRecordModel, {
        weight_record_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        weight: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: false },
        weight_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        animal_age_in_days: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'weight_records', 'WeightRecord');
    class BirthModel extends sequelize_1.Model {
    }
    initOperationalModel(sequelize, BirthModel, {
        birth_uuid: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        mother_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        father_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        newborn_animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        birth_date: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        birth_weight: { type: sequelize_1.DataTypes.DECIMAL(10, 2), allowNull: true },
        sex: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        birth_type: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        birth_status: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        temporary_identifier: { type: sequelize_1.DataTypes.STRING, allowNull: true },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'births', 'Birth');
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
