import { Optional } from 'sequelize';
import {
    CorralActivityCode,
    CorralSessionSourceType,
    CorralStepWorkMode,
    CorralVisualConditionCode,
    CorralWorkSessionStatus,
} from '../../constants/corral-work.constants';

export interface CorralWorkSessionAttributes {
    uuid_corral_work_session: string;
    ranch_uuid: string;
    paddock_uuid?: string | null;
    work_date: Date;
    status: CorralWorkSessionStatus;
    notes?: string | null;
    responsible_person?: string | null;
    planned_medicine_uuid?: string | null;
    created_by?: string | null;
    started_at?: Date | null;
    closed_at?: Date | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CorralWorkSessionCreationAttributes = Optional<
    CorralWorkSessionAttributes,
    | 'uuid_corral_work_session'
    | 'paddock_uuid'
    | 'status'
    | 'notes'
    | 'responsible_person'
    | 'planned_medicine_uuid'
    | 'created_by'
    | 'started_at'
    | 'closed_at'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
>;

export interface CorralSessionStepAttributes {
    uuid_corral_session_step: string;
    uuid_corral_work_session: string;
    step_order: number;
    label?: string | null;
    work_mode: CorralStepWorkMode;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CorralSessionStepCreationAttributes = Optional<
    CorralSessionStepAttributes,
    'uuid_corral_session_step' | 'label' | 'work_mode' | 'is_active' | 'created_at' | 'updated_at'
>;

export interface CorralStepActivityAttributes {
    uuid_corral_step_activity: string;
    uuid_corral_session_step: string;
    activity_code: CorralActivityCode;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CorralStepActivityCreationAttributes = Optional<
    CorralStepActivityAttributes,
    'uuid_corral_step_activity' | 'is_active' | 'created_at' | 'updated_at'
>;

export interface CorralSessionSourceAttributes {
    uuid_corral_session_source: string;
    uuid_corral_work_session: string;
    source_type: CorralSessionSourceType;
    paddock_uuid?: string | null;
    filter_key?: string | null;
    filter_value?: string | null;
    animal_uuid?: string | null;
    is_active: boolean;
}

export type CorralSessionSourceCreationAttributes = Optional<
    CorralSessionSourceAttributes,
    'uuid_corral_session_source' | 'paddock_uuid' | 'filter_key' | 'filter_value' | 'animal_uuid' | 'is_active'
>;

export interface CorralSessionAnimalAttributes {
    uuid_corral_session_animal: string;
    uuid_corral_work_session: string;
    animal_uuid: string;
    registration_number: string;
    chip_number?: string | null;
    attended: boolean;
    is_expected: boolean;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface CorralStepAnimalAttributes {
    uuid_corral_step_animal: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step: string;
    animal_uuid: string;
    scanned_at?: Date | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CorralStepAnimalCreationAttributes = Optional<
    CorralStepAnimalAttributes,
    'uuid_corral_step_animal' | 'is_active' | 'created_at' | 'updated_at'
>;

export type CorralSessionAnimalCreationAttributes = Optional<
    CorralSessionAnimalAttributes,
    | 'uuid_corral_session_animal'
    | 'chip_number'
    | 'attended'
    | 'is_expected'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
>;

export interface CorralActivityRecordAttributes {
    uuid_corral_activity_record: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step: string;
    animal_uuid: string;
    activity_code: CorralActivityCode;
    bool_value?: boolean | null;
    numeric_value?: number | null;
    text_value?: string | null;
    medicine_uuid?: string | null;
    dose?: string | null;
    unit?: string | null;
    identification_type?: string | null;
    weight_record_uuid?: string | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type CorralActivityRecordCreationAttributes = Optional<
    CorralActivityRecordAttributes,
    | 'uuid_corral_activity_record'
    | 'bool_value'
    | 'numeric_value'
    | 'text_value'
    | 'medicine_uuid'
    | 'dose'
    | 'unit'
    | 'identification_type'
    | 'weight_record_uuid'
    | 'is_active'
    | 'created_at'
    | 'updated_at'
>;

export interface CorralAnimalObservationAttributes {
    uuid_corral_animal_observation: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step?: string | null;
    animal_uuid: string;
    observation_text: string;
    is_active: boolean;
    created_at?: Date;
}

export interface CorralAnimalVisualConditionAttributes {
    uuid_corral_animal_visual_condition: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step?: string | null;
    animal_uuid: string;
    condition_code: CorralVisualConditionCode;
    is_active: boolean;
    created_at?: Date;
}

export interface CorralAnimalAdditionalMedicationAttributes {
    uuid_corral_animal_additional_medication: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step?: string | null;
    animal_uuid: string;
    product_name: string;
    medicine_uuid?: string | null;
    dose?: string | null;
    unit?: string | null;
    is_active: boolean;
    created_at?: Date;
}

export interface CorralAnimalAdditionalTreatmentAttributes {
    uuid_corral_animal_additional_treatment: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step?: string | null;
    animal_uuid: string;
    treatment_type: string;
    description?: string | null;
    is_active: boolean;
    created_at?: Date;
}

export interface CorralActivityAssignmentInput {
    activity_code: CorralActivityCode;
    step_order: number;
}

export interface CorralSessionSourceFilterInput {
    filter_key: string;
    filter_value: string;
}

export interface CreateCorralWorkSessionBody {
    ranch_uuid: string;
    work_date: string;
    responsible_person?: string | null;
    notes?: string | null;
    activity_assignments?: CorralActivityAssignmentInput[];
    created_by?: string | null;
}

export interface ConfigureCorralWorkStepInput {
    step_order: number;
    label?: string | null;
    work_mode?: CorralStepWorkMode;
    activity_codes: CorralActivityCode[];
}

export interface ConfigureCorralWorkBody {
    steps: ConfigureCorralWorkStepInput[];
}

export interface UpdateCorralStepWorkModeBody {
    work_mode: CorralStepWorkMode;
}

export interface AppendCorralStepAnimalsBody {
    source_paddock_uuids?: string[];
    source_filters?: CorralSessionSourceFilterInput[];
    manual_animal_uuids?: string[];
}

export interface ScanCorralStepAnimalBody {
    identifier: string;
}

export interface CorralStepAnimalAssignmentInput {
    uuid_corral_session_step: string;
    animal_uuids: string[];
}

export interface CorralSessionAnimalsLoadBody {
    source_paddock_uuids?: string[];
    source_filters?: CorralSessionSourceFilterInput[];
    manual_animal_uuids?: string[];
    step_assignments: CorralStepAnimalAssignmentInput[];
}

export interface CorralSessionAnimalPreviewItem {
    animal_uuid: string;
    registration_number: string;
    chip_number?: string | null;
    sex?: string;
    breed_code?: string;
    current_paddock_uuid?: string | null;
}

export interface CorralSessionAnimalsPreviewDto {
    total_count: number;
    animals: CorralSessionAnimalPreviewItem[];
    breakdown: {
        from_paddocks: number;
        from_filters: number;
        from_manual: number;
    };
}

export interface CorralSessionAnimalsLoadResultDto {
    total_count: number;
    sources_saved: number;
}

export interface CorralStepGridColumnDto {
    activity_code: CorralActivityCode;
    column_key: string;
    label: string;
    value_type: 'boolean' | 'number' | 'text' | 'medicine' | 'paddock_current' | 'paddock_destination';
}

export interface CorralStepGridDto {
    uuid_corral_session_step: string;
    step_order: number;
    label?: string | null;
    work_mode: CorralStepWorkMode;
    columns: CorralStepGridColumnDto[];
    rows: CorralStepGridRowDto[];
    animal_count: number;
    scanned_animal_uuids?: string[];
}

export interface CorralStepGridRowDto {
    animal_uuid: string;
    registration_number: string;
    chip_number?: string | null;
    missing_inventory?: boolean;
    current_paddock_uuid?: string | null;
    current_paddock_name?: string | null;
    session_origin_paddock_name?: string | null;
    session_destination_paddock_name?: string | null;
    values: Record<string, string | number | boolean | string[] | null>;
}

export interface ApplyPaddockDistributionMove {
    animal_uuid: string;
    destination_paddock_uuid: string;
}

export interface ApplyPaddockDistributionBody {
    moves: ApplyPaddockDistributionMove[];
}

export interface PaddockCapacityWarningDto {
    paddock_uuid: string;
    paddock_name: string;
    maximum_capacity: number;
    projected_count: number;
}

export interface ApplyPaddockDistributionResultDto {
    moved_count: number;
    capacity_warnings: PaddockCapacityWarningDto[];
    session_status: CorralWorkSessionStatus;
    grid: CorralStepGridDto;
}

export interface PendingAnimalRegistrationSessionDto {
    uuid_corral_work_session: string;
    work_date: string;
    responsible_person: string | null;
    status: string;
}

export interface PendingAnimalRegistrationDto {
    registration_number: string;
    ranch_uuid: string;
    first_seen_at: string;
    last_seen_at: string;
    sessions: PendingAnimalRegistrationSessionDto[];
}

export interface CorralUnregisteredStepRowAttributes {
    uuid_corral_unregistered_step_row: string;
    uuid_corral_work_session: string;
    uuid_corral_session_step: string;
    registration_number: string;
    cell_values: Record<string, string | number | boolean | string[] | null>;
    scanned_at?: Date | null;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface CorralSessionWorkspaceDto {
    session: CorralWorkSessionAttributes & {
        steps: Array<{
            uuid_corral_session_step: string;
            step_order: number;
            label?: string | null;
            work_mode: CorralStepWorkMode;
            activities: CorralActivityCode[];
        }>;
        animal_count: number;
    };
    grids: CorralStepGridDto[];
    findings_summary_count: number;
}

export interface SaveCorralStepGridBody {
    rows: Array<{
        animal_uuid: string;
        registration_number?: string;
        missing_inventory?: boolean;
        values: Record<string, string | number | boolean | string[] | null>;
    }>;
    scanned_animal_uuids?: string[];
}

export interface UpsertCorralFindingBody {
    animal_uuid: string;
    uuid_corral_session_step?: string | null;
    observation_text?: string | null;
    condition_code?: CorralVisualConditionCode | null;
    additional_medications?: Array<{
        product_name: string;
        medicine_uuid?: string | null;
        dose?: string | null;
        unit?: string | null;
    }>;
    additional_treatments?: Array<{
        treatment_type: string;
        description?: string | null;
    }>;
}

export interface AnimalCorralWorkHistoryActivityDto {
    activity_code: CorralActivityCode | string;
    values: string[];
}

export interface AnimalCorralWorkHistorySessionDto {
    uuid_corral_work_session: string;
    work_date: string;
    status: CorralWorkSessionStatus;
    responsible_person?: string | null;
    activities: AnimalCorralWorkHistoryActivityDto[];
    observations: string[];
    condition_codes: CorralVisualConditionCode[];
    medications: string[];
    treatments: string[];
}

export interface AnimalCorralProfileDto {
    animal_uuid: string;
    registration_number: string;
    chip_number?: string | null;
    sex: string;
    breed_code?: string | null;
    color?: string | null;
    birth_date: string;
    origin_type: string;
    paddock_name?: string | null;
}

export interface AnimalCorralWorkHistoryDto {
    animal_uuid: string;
    registration_number: string;
    chip_number?: string | null;
    profile: AnimalCorralProfileDto;
    sessions: AnimalCorralWorkHistorySessionDto[];
}

export interface AnimalWorkHistorySource {
    sessions: CorralWorkSessionAttributes[];
    records: CorralActivityRecordAttributes[];
    observations: CorralAnimalObservationAttributes[];
    conditions: CorralAnimalVisualConditionAttributes[];
    medications: CorralAnimalAdditionalMedicationAttributes[];
    treatments: CorralAnimalAdditionalTreatmentAttributes[];
}

export interface CorralSessionDetailDto extends CorralWorkSessionAttributes {
    responsible_person?: string | null;
    steps: Array<{
        uuid_corral_session_step: string;
        step_order: number;
        label?: string | null;
        work_mode: CorralStepWorkMode;
        activities: CorralActivityCode[];
    }>;
    sources: CorralSessionSourceAttributes[];
    planned_activities: CorralActivityCode[];
    animal_count: number;
    animals_loaded: boolean;
    work_configured: boolean;
    requires_animal_load: boolean;
}
