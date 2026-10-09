import { DataTypes, Model, ModelAttributes, ModelStatic, Sequelize } from 'sequelize';

function initCorralModel<T extends Model>(
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

export function createCorralSessionOperationalModels(sequelize: Sequelize) {
    class CorralSessionStepModel extends Model {}
    initCorralModel(sequelize, CorralSessionStepModel, {
        uuid_corral_session_step: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        step_order: { type: DataTypes.INTEGER, allowNull: false },
        label: { type: DataTypes.STRING(128), allowNull: true },
        work_mode: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'PRELOADED_SEARCH' },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_steps', 'CorralSessionStep');

    class CorralStepActivityModel extends Model {}
    initCorralModel(sequelize, CorralStepActivityModel, {
        uuid_corral_step_activity: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: false },
        activity_code: { type: DataTypes.STRING(64), allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_step_activities', 'CorralStepActivity');

    class CorralSessionSourceModel extends Model {}
    initCorralModel(sequelize, CorralSessionSourceModel, {
        uuid_corral_session_source: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        source_type: { type: DataTypes.STRING(32), allowNull: false },
        paddock_uuid: { type: DataTypes.UUID, allowNull: true },
        filter_key: { type: DataTypes.STRING(64), allowNull: true },
        filter_value: { type: DataTypes.STRING(128), allowNull: true },
        animal_uuid: { type: DataTypes.UUID, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_sources', 'CorralSessionSource');

    class CorralSessionAnimalModel extends Model {}
    initCorralModel(sequelize, CorralSessionAnimalModel, {
        uuid_corral_session_animal: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        registration_number: { type: DataTypes.STRING(128), allowNull: false },
        chip_number: { type: DataTypes.STRING(128), allowNull: true },
        attended: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        is_expected: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_animals', 'CorralSessionAnimal');

    class CorralStepAnimalModel extends Model {}
    initCorralModel(sequelize, CorralStepAnimalModel, {
        uuid_corral_step_animal: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: false },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        scanned_at: { type: DataTypes.DATE, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_step_animals', 'CorralStepAnimal');

    class CorralActivityRecordModel extends Model {}
    initCorralModel(sequelize, CorralActivityRecordModel, {
        uuid_corral_activity_record: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: false },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        activity_code: { type: DataTypes.STRING(64), allowNull: false },
        bool_value: { type: DataTypes.BOOLEAN, allowNull: true },
        numeric_value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        text_value: { type: DataTypes.STRING(512), allowNull: true },
        medicine_uuid: { type: DataTypes.UUID, allowNull: true },
        dose: { type: DataTypes.STRING(64), allowNull: true },
        unit: { type: DataTypes.STRING(32), allowNull: true },
        identification_type: { type: DataTypes.STRING(64), allowNull: true },
        weight_record_uuid: { type: DataTypes.UUID, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_activity_records', 'CorralActivityRecord');

    class CorralAnimalObservationModel extends Model {}
    initCorralModel(sequelize, CorralAnimalObservationModel, {
        uuid_corral_animal_observation: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: true },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        observation_text: { type: DataTypes.TEXT, allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_observations', 'CorralAnimalObservation');

    class CorralAnimalVisualConditionModel extends Model {}
    initCorralModel(sequelize, CorralAnimalVisualConditionModel, {
        uuid_corral_animal_visual_condition: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: true },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        condition_code: { type: DataTypes.STRING(64), allowNull: false },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_visual_conditions', 'CorralAnimalVisualCondition');

    class CorralAnimalAdditionalMedicationModel extends Model {}
    initCorralModel(sequelize, CorralAnimalAdditionalMedicationModel, {
        uuid_corral_animal_additional_medication: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: true },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        product_name: { type: DataTypes.STRING(256), allowNull: false },
        medicine_uuid: { type: DataTypes.UUID, allowNull: true },
        dose: { type: DataTypes.STRING(64), allowNull: true },
        unit: { type: DataTypes.STRING(32), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_additional_medications', 'CorralAnimalAdditionalMedication');

    class CorralUnregisteredStepRowModel extends Model {}
    initCorralModel(sequelize, CorralUnregisteredStepRowModel, {
        uuid_corral_unregistered_step_row: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: false },
        registration_number: { type: DataTypes.STRING(128), allowNull: false },
        cell_values: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
        scanned_at: { type: DataTypes.DATE, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_unregistered_step_rows', 'CorralUnregisteredStepRow');

    class CorralAnimalAdditionalTreatmentModel extends Model {}
    initCorralModel(sequelize, CorralAnimalAdditionalTreatmentModel, {
        uuid_corral_animal_additional_treatment: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: DataTypes.UUID, allowNull: true },
        animal_uuid: { type: DataTypes.UUID, allowNull: false },
        treatment_type: { type: DataTypes.STRING(128), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_additional_treatments', 'CorralAnimalAdditionalTreatment');

    return {
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
        CorralUnregisteredStepRowModel,
    };
}

export type CorralSessionOperationalModelsBundle = ReturnType<typeof createCorralSessionOperationalModels>;
