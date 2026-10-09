"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRAL_ACTIVITY_DEFAULT_WORK_MODES = exports.CORRAL_ACTIVITY_VALUE_TYPES = exports.CORRAL_ACTIVITY_COLUMN_LABELS = exports.CORRAL_ACTIVITY_HISTORY_TARGET = exports.CORRAL_MULTI_RECORD_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_ICONS = exports.CORRAL_ACTIVITY_CODE_SET = exports.CORRAL_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_CATALOG = void 0;
exports.isCorralActivityCode = isCorralActivityCode;
exports.getCorralActivityDefinition = getCorralActivityDefinition;
exports.isMultiRecordActivity = isMultiRecordActivity;
exports.isGridColumnActivity = isGridColumnActivity;
exports.isPaddockMoveActivity = isPaddockMoveActivity;
/** Single source of truth for corral activity codes (UI + API). */
exports.CORRAL_ACTIVITY_CATALOG = [
    {
        code: 'ATTENDANCE',
        icon: 'bi-clipboard2-check',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Attendance',
        valueType: 'boolean',
        multiRecord: false
    },
    {
        code: 'WEIGHING',
        icon: 'bi-speedometer2',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Weight',
        valueType: 'number',
        multiRecord: false,
        historyTarget: 'weight_records'
    },
    {
        code: 'VACCINATION',
        icon: 'bi-shield-plus',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Vaccine',
        valueType: 'medicine',
        multiRecord: true,
        historyTarget: 'health_campaign_animals'
    },
    {
        code: 'IDENTIFICATION',
        icon: 'bi-upc-scan',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Identification',
        valueType: 'text',
        multiRecord: false,
        historyTarget: 'animal_identifications'
    },
    {
        code: 'DEWORMING',
        icon: 'bi-bug',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Deworming',
        valueType: 'medicine',
        multiRecord: true,
        historyTarget: 'corral_deworming_entries'
    },
    {
        code: 'TREATMENT',
        icon: 'bi-heart-pulse',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Treatment',
        valueType: 'text',
        multiRecord: false,
        historyTarget: 'corral_treatment_entries'
    },
    {
        code: 'INSPECTION',
        icon: 'bi-eye',
        defaultWorkMode: 'SCAN_DYNAMIC',
        columnLabel: 'Inspection',
        valueType: 'text',
        multiRecord: false
    },
    {
        code: 'PADDOCK_MOVE',
        icon: 'bi-arrow-left-right',
        defaultWorkMode: 'PRELOADED_SEARCH',
        columnLabel: 'Paddock',
        valueType: 'text',
        multiRecord: false,
        historyTarget: 'animal_movements'
    }
];
exports.CORRAL_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_CATALOG.map((item) => item.code);
exports.CORRAL_ACTIVITY_CODE_SET = new Set(exports.CORRAL_ACTIVITY_CODES);
function isCorralActivityCode(value) {
    return typeof value === 'string' && exports.CORRAL_ACTIVITY_CODE_SET.has(value);
}
function getCorralActivityDefinition(code) {
    return exports.CORRAL_ACTIVITY_CATALOG.find((item) => item.code === code);
}
exports.CORRAL_ACTIVITY_ICONS = exports.CORRAL_ACTIVITY_CATALOG.reduce((acc, item) => {
    acc[item.code] = item.icon;
    return acc;
}, {});
exports.CORRAL_MULTI_RECORD_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_CATALOG.filter((item) => item.multiRecord).map((item) => item.code);
function isMultiRecordActivity(code) {
    return exports.CORRAL_MULTI_RECORD_ACTIVITY_CODES.includes(code);
}
function isGridColumnActivity(code) {
    const definition = getCorralActivityDefinition(code);
    return Boolean(definition && !definition.skipGridColumn);
}
function isPaddockMoveActivity(code) {
    return code === 'PADDOCK_MOVE';
}
exports.CORRAL_ACTIVITY_HISTORY_TARGET = exports.CORRAL_ACTIVITY_CATALOG.reduce((acc, item) => {
    if (item.historyTarget) {
        acc[item.code] = item.historyTarget;
    }
    return acc;
}, {});
exports.CORRAL_ACTIVITY_COLUMN_LABELS = exports.CORRAL_ACTIVITY_CATALOG.reduce((acc, item) => {
    acc[item.code] = item.columnLabel;
    return acc;
}, {});
exports.CORRAL_ACTIVITY_VALUE_TYPES = exports.CORRAL_ACTIVITY_CATALOG.reduce((acc, item) => {
    acc[item.code] = item.valueType;
    return acc;
}, {});
exports.CORRAL_ACTIVITY_DEFAULT_WORK_MODES = exports.CORRAL_ACTIVITY_CATALOG.reduce((acc, item) => {
    acc[item.code] = item.defaultWorkMode;
    return acc;
}, {});
