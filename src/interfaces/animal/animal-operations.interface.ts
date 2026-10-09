import { Optional } from "sequelize";

export interface WorkOrderAttributes {
    work_order_uuid: string;
    ranch_uuid: string;
    work_date: Date;
    work_type: string;
    performed_by?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type WorkOrderCreationAttributes = Optional<WorkOrderAttributes, 'work_order_uuid' | 'performed_by' | 'description' | 'is_active'>;

export interface WorkOrderAnimalAttributes {
    work_order_animal_uuid: string;
    work_order_uuid: string;
    animal_uuid: string;
    is_active: boolean;
}
export type WorkOrderAnimalCreationAttributes = Optional<WorkOrderAnimalAttributes, 'work_order_animal_uuid' | 'is_active'>;

export interface MilkingSessionAttributes {
    milking_session_uuid: string;
    ranch_uuid: string;
    milking_date: Date;
    shift?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type MilkingSessionCreationAttributes = Optional<MilkingSessionAttributes, 'milking_session_uuid' | 'shift' | 'description' | 'is_active'>;

export interface MilkRecordAttributes {
    milk_record_uuid: string;
    milking_session_uuid: string;
    animal_uuid: string;
    liters_produced: number;
    milk_quality?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type MilkRecordCreationAttributes = Optional<MilkRecordAttributes, 'milk_record_uuid' | 'milk_quality' | 'description' | 'is_active'>;

export interface AnimalPurchaseAttributes {
    animal_purchase_uuid: string;
    animal_uuid: string;
    purchase_date: Date;
    seller_name?: string | null;
    purchase_price: number;
    currency: string;
    origin_ranch?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AnimalPurchaseCreationAttributes = Optional<AnimalPurchaseAttributes, 'animal_purchase_uuid' | 'seller_name' | 'origin_ranch' | 'description' | 'is_active'>;

export interface AnimalSaleAttributes {
    animal_sale_uuid: string;
    animal_uuid: string;
    sale_date: Date;
    buyer_name?: string | null;
    sale_price: number;
    currency: string;
    destination?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AnimalSaleCreationAttributes = Optional<AnimalSaleAttributes, 'animal_sale_uuid' | 'buyer_name' | 'destination' | 'description' | 'is_active'>;

export interface AnimalDisposalAttributes {
    animal_disposal_uuid: string;
    animal_uuid: string;
    disposal_date: Date;
    disposal_type: string;
    reason?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AnimalDisposalCreationAttributes = Optional<AnimalDisposalAttributes, 'animal_disposal_uuid' | 'reason' | 'description' | 'is_active'>;

export interface InventoryItemAttributes {
    inventory_item_uuid: string;
    ranch_uuid: string;
    name: string;
    category?: string | null;
    quantity: number;
    unit_of_measure: string;
    expiration_date?: Date | null;
    description?: string | null;
    is_active: boolean;
}
export type InventoryItemCreationAttributes = Optional<InventoryItemAttributes, 'inventory_item_uuid' | 'category' | 'expiration_date' | 'description' | 'is_active'>;

export interface NaturalBreedingSeasonAttributes {
    natural_breeding_season_uuid: string;
    ranch_uuid: string;
    season_name: string;
    start_date: Date;
    end_date?: Date | null;
    description?: string | null;
    is_active: boolean;
}
export type NaturalBreedingSeasonCreationAttributes = Optional<NaturalBreedingSeasonAttributes, 'natural_breeding_season_uuid' | 'end_date' | 'description' | 'is_active'>;

export interface NaturalBreedingBullAttributes {
    natural_breeding_bull_uuid: string;
    natural_breeding_season_uuid: string;
    bull_animal_uuid: string;
    is_active: boolean;
}
export type NaturalBreedingBullCreationAttributes = Optional<NaturalBreedingBullAttributes, 'natural_breeding_bull_uuid' | 'is_active'>;

export interface NaturalBreedingFemaleAttributes {
    natural_breeding_female_uuid: string;
    natural_breeding_season_uuid: string;
    female_animal_uuid: string;
    is_active: boolean;
}
export type NaturalBreedingFemaleCreationAttributes = Optional<NaturalBreedingFemaleAttributes, 'natural_breeding_female_uuid' | 'is_active'>;

export interface PregnancyCheckAttributes {
    pregnancy_check_uuid: string;
    female_animal_uuid: string;
    check_date: Date;
    result: string;
    estimated_pregnancy_days?: number | null;
    description?: string | null;
    is_active: boolean;
}
export type PregnancyCheckCreationAttributes = Optional<PregnancyCheckAttributes, 'pregnancy_check_uuid' | 'estimated_pregnancy_days' | 'description' | 'is_active'>;

export interface AbortionAttributes {
    abortion_uuid: string;
    female_animal_uuid: string;
    abortion_date: Date;
    estimated_pregnancy_month?: number | null;
    possible_cause?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AbortionCreationAttributes = Optional<AbortionAttributes, 'abortion_uuid' | 'estimated_pregnancy_month' | 'possible_cause' | 'description' | 'is_active'>;

export interface HealthCampaignAttributes {
    health_campaign_uuid: string;
    ranch_uuid: string;
    campaign_date: Date;
    performed_by?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type HealthCampaignCreationAttributes = Optional<HealthCampaignAttributes, 'health_campaign_uuid' | 'performed_by' | 'description' | 'is_active'>;

export interface HealthCampaignTreatmentAttributes {
    health_campaign_treatment_uuid: string;
    health_campaign_uuid: string;
    medicine_uuid: string;
    treatment_type?: string | null;
    dose?: string | null;
    application_method?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type HealthCampaignTreatmentCreationAttributes = Optional<HealthCampaignTreatmentAttributes, 'health_campaign_treatment_uuid' | 'treatment_type' | 'dose' | 'application_method' | 'description' | 'is_active'>;

export interface HealthCampaignAnimalAttributes {
    health_campaign_animal_uuid: string;
    health_campaign_uuid: string;
    animal_uuid: string;
    is_active: boolean;
}
export type HealthCampaignAnimalCreationAttributes = Optional<HealthCampaignAnimalAttributes, 'health_campaign_animal_uuid' | 'is_active'>;

export interface MedicineAttributes {
    medicine_uuid: string;
    name: string;
    medicine_type?: string | null;
    batch_number?: string | null;
    expiration_date?: Date | null;
    supplier?: string | null;
    is_active: boolean;
}
export type MedicineCreationAttributes = Optional<MedicineAttributes, 'medicine_uuid' | 'medicine_type' | 'batch_number' | 'expiration_date' | 'supplier' | 'is_active'>;

export interface InseminationAttributes {
    insemination_uuid: string;
    female_animal_uuid: string;
    insemination_date: Date;
    semen_code?: string | null;
    bull_name?: string | null;
    bull_breed?: string | null;
    semen_supplier?: string | null;
    technician_name?: string | null;
    insemination_method?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type InseminationCreationAttributes = Optional<InseminationAttributes, 'insemination_uuid' | 'semen_code' | 'bull_name' | 'bull_breed' | 'semen_supplier' | 'technician_name' | 'insemination_method' | 'description' | 'is_active'>;

export interface RanchProductionTypeAttributes {
    ranch_production_type_uuid: string;
    ranch_uuid: string;
    production_type: string;
    description?: string | null;
    is_active: boolean;
}
export type RanchProductionTypeCreationAttributes = Optional<RanchProductionTypeAttributes, 'ranch_production_type_uuid' | 'description' | 'is_active'>;

export interface PaddockAttributes {
    paddock_uuid: string;
    ranch_uuid: string;
    name: string;
    size_in_hectares?: number | null;
    grass_type?: string | null;
    water_source?: string | null;
    maximum_capacity?: number | null;
    status?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type PaddockCreationAttributes = Optional<PaddockAttributes, 'paddock_uuid' | 'size_in_hectares' | 'grass_type' | 'water_source' | 'maximum_capacity' | 'status' | 'description' | 'is_active'>;

export interface AnimalMovementAttributes {
    animal_movement_uuid: string;
    animal_uuid: string;
    origin_paddock_uuid?: string | null;
    destination_paddock_uuid?: string | null;
    movement_date: Date;
    movement_reason?: string | null;
    description?: string | null;
    uuid_corral_work_session?: string | null;
    is_active: boolean;
}
export type AnimalMovementCreationAttributes = Optional<AnimalMovementAttributes, 'animal_movement_uuid' | 'origin_paddock_uuid' | 'destination_paddock_uuid' | 'movement_reason' | 'description' | 'uuid_corral_work_session' | 'is_active'>;

export interface OwnerAttributes {
    owner_uuid: string;
    full_name: string;
    document_number?: string | null;
    phone_number?: string | null;
    email?: string | null;
    address?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type OwnerCreationAttributes = Optional<OwnerAttributes, 'owner_uuid' | 'document_number' | 'phone_number' | 'email' | 'address' | 'description' | 'is_active'>;

export interface AnimalOwnerTransferAttributes {
    animal_owner_transfer_uuid: string;
    animal_uuid: string;
    previous_owner_uuid?: string | null;
    new_owner_uuid?: string | null;
    transfer_date: Date;
    transfer_reason?: string | null;
    sale_price?: number | null;
    currency?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AnimalOwnerTransferCreationAttributes = Optional<AnimalOwnerTransferAttributes, 'animal_owner_transfer_uuid' | 'previous_owner_uuid' | 'new_owner_uuid' | 'transfer_reason' | 'sale_price' | 'currency' | 'description' | 'is_active'>;

export interface AnimalIdentificationAttributes {
    animal_identification_uuid: string;
    animal_uuid: string;
    ranch_uuid: string;
    identification_type: 'ear_tag' | 'rfid' | 'brand' | 'tattoo' | 'temporary_birth_mark' | 'visual_identifier';
    identification_number: string;
    is_temporary: boolean;
    assigned_date: Date;
    expiration_date?: Date | null;
    status?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type AnimalIdentificationCreationAttributes = Optional<AnimalIdentificationAttributes, 'animal_identification_uuid' | 'expiration_date' | 'status' | 'description' | 'is_active'>;

export interface WeightRecordAttributes {
    weight_record_uuid: string;
    animal_uuid: string;
    weight: number;
    weight_date: Date;
    animal_age_in_days?: number | null;
    description?: string | null;
    is_active: boolean;
}
export type WeightRecordCreationAttributes = Optional<WeightRecordAttributes, 'weight_record_uuid' | 'animal_age_in_days' | 'description' | 'is_active'>;

export interface BirthAttributes {
    birth_uuid: string;
    mother_animal_uuid: string;
    father_animal_uuid?: string | null;
    newborn_animal_uuid?: string | null;
    birth_date: Date;
    birth_weight?: number | null;
    sex?: string | null;
    birth_type?: string | null;
    birth_status?: string | null;
    temporary_identifier?: string | null;
    description?: string | null;
    is_active: boolean;
}
export type BirthCreationAttributes = Optional<BirthAttributes, 'birth_uuid' | 'father_animal_uuid' | 'newborn_animal_uuid' | 'birth_weight' | 'sex' | 'birth_type' | 'birth_status' | 'temporary_identifier' | 'description' | 'is_active'>;
