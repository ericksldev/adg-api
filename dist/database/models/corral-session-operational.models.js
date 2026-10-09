"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorralSessionOperationalModels = createCorralSessionOperationalModels;
const sequelize_1 = require("sequelize");
function initCorralModel(sequelize, model, attributes, tableName, modelName) {
    model.init(attributes, {
        sequelize,
        timestamps: true,
        underscored: true,
        tableName,
        modelName,
    });
}
function createCorralSessionOperationalModels(sequelize) {
    class CorralSessionStepModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralSessionStepModel, {
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        step_order: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
        label: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
        work_mode: { type: sequelize_1.DataTypes.STRING(32), allowNull: false, defaultValue: 'PRELOADED_SEARCH' },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_steps', 'CorralSessionStep');
    class CorralStepActivityModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralStepActivityModel, {
        uuid_corral_step_activity: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        activity_code: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_step_activities', 'CorralStepActivity');
    class CorralSessionSourceModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralSessionSourceModel, {
        uuid_corral_session_source: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        source_type: { type: sequelize_1.DataTypes.STRING(32), allowNull: false },
        paddock_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        filter_key: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
        filter_value: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_sources', 'CorralSessionSource');
    class CorralSessionAnimalModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralSessionAnimalModel, {
        uuid_corral_session_animal: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        registration_number: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
        chip_number: { type: sequelize_1.DataTypes.STRING(128), allowNull: true },
        attended: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        is_expected: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_session_animals', 'CorralSessionAnimal');
    class CorralStepAnimalModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralStepAnimalModel, {
        uuid_corral_step_animal: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        scanned_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_step_animals', 'CorralStepAnimal');
    class CorralActivityRecordModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralActivityRecordModel, {
        uuid_corral_activity_record: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        activity_code: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
        bool_value: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: true },
        numeric_value: { type: sequelize_1.DataTypes.DECIMAL(12, 2), allowNull: true },
        text_value: { type: sequelize_1.DataTypes.STRING(512), allowNull: true },
        medicine_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        dose: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
        unit: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
        identification_type: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
        weight_record_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_activity_records', 'CorralActivityRecord');
    class CorralAnimalObservationModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralAnimalObservationModel, {
        uuid_corral_animal_observation: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        observation_text: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_observations', 'CorralAnimalObservation');
    class CorralAnimalVisualConditionModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralAnimalVisualConditionModel, {
        uuid_corral_animal_visual_condition: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        condition_code: { type: sequelize_1.DataTypes.STRING(64), allowNull: false },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_visual_conditions', 'CorralAnimalVisualCondition');
    class CorralAnimalAdditionalMedicationModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralAnimalAdditionalMedicationModel, {
        uuid_corral_animal_additional_medication: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        product_name: { type: sequelize_1.DataTypes.STRING(256), allowNull: false },
        medicine_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        dose: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
        unit: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_animal_additional_medications', 'CorralAnimalAdditionalMedication');
    class CorralUnregisteredStepRowModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralUnregisteredStepRowModel, {
        uuid_corral_unregistered_step_row: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        registration_number: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
        cell_values: { type: sequelize_1.DataTypes.JSONB, allowNull: false, defaultValue: {} },
        scanned_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    }, 'corral_unregistered_step_rows', 'CorralUnregisteredStepRow');
    class CorralAnimalAdditionalTreatmentModel extends sequelize_1.Model {
    }
    initCorralModel(sequelize, CorralAnimalAdditionalTreatmentModel, {
        uuid_corral_animal_additional_treatment: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
        uuid_corral_work_session: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        uuid_corral_session_step: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        animal_uuid: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        treatment_type: { type: sequelize_1.DataTypes.STRING(128), allowNull: false },
        description: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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
