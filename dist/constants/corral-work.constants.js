"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRAL_PRELOADED_WORK_MODES = exports.CORRAL_STEP_WORK_MODES = exports.CorralStepWorkMode = exports.CORRAL_VISUAL_CONDITION_CODES = exports.CorralVisualConditionCode = exports.CorralSessionSourceType = exports.CorralWorkSessionStatus = exports.CorralActivityCode = exports.isPaddockMoveActivity = exports.isMultiRecordActivity = exports.isGridColumnActivity = exports.isCorralActivityCode = exports.getCorralActivityDefinition = exports.CORRAL_MULTI_RECORD_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_VALUE_TYPES = exports.CORRAL_ACTIVITY_ICONS = exports.CORRAL_ACTIVITY_HISTORY_TARGET = exports.CORRAL_ACTIVITY_DEFAULT_WORK_MODES = exports.CORRAL_ACTIVITY_COLUMN_LABELS = exports.CORRAL_ACTIVITY_CODE_SET = exports.CORRAL_ACTIVITY_CODES = exports.CORRAL_ACTIVITY_CATALOG = void 0;
const corral_activities_constants_1 = require("./corral-activities.constants");
Object.defineProperty(exports, "CORRAL_ACTIVITY_CATALOG", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_CATALOG; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_CODES", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_CODES; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_CODE_SET", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_CODE_SET; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_COLUMN_LABELS", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_COLUMN_LABELS; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_DEFAULT_WORK_MODES", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_DEFAULT_WORK_MODES; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_HISTORY_TARGET", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_HISTORY_TARGET; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_ICONS", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_ICONS; } });
Object.defineProperty(exports, "CORRAL_ACTIVITY_VALUE_TYPES", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_ACTIVITY_VALUE_TYPES; } });
Object.defineProperty(exports, "CORRAL_MULTI_RECORD_ACTIVITY_CODES", { enumerable: true, get: function () { return corral_activities_constants_1.CORRAL_MULTI_RECORD_ACTIVITY_CODES; } });
Object.defineProperty(exports, "getCorralActivityDefinition", { enumerable: true, get: function () { return corral_activities_constants_1.getCorralActivityDefinition; } });
Object.defineProperty(exports, "isCorralActivityCode", { enumerable: true, get: function () { return corral_activities_constants_1.isCorralActivityCode; } });
Object.defineProperty(exports, "isGridColumnActivity", { enumerable: true, get: function () { return corral_activities_constants_1.isGridColumnActivity; } });
Object.defineProperty(exports, "isMultiRecordActivity", { enumerable: true, get: function () { return corral_activities_constants_1.isMultiRecordActivity; } });
Object.defineProperty(exports, "isPaddockMoveActivity", { enumerable: true, get: function () { return corral_activities_constants_1.isPaddockMoveActivity; } });
/** Enum-like map for existing API code that references CorralActivityCode.ATTENDANCE. */
exports.CorralActivityCode = corral_activities_constants_1.CORRAL_ACTIVITY_CODES.reduce((acc, code) => {
    acc[code] = code;
    return acc;
}, {});
var CorralWorkSessionStatus;
(function (CorralWorkSessionStatus) {
    CorralWorkSessionStatus["DRAFT"] = "DRAFT";
    CorralWorkSessionStatus["IN_PROGRESS"] = "IN_PROGRESS";
    CorralWorkSessionStatus["CLOSED"] = "CLOSED";
})(CorralWorkSessionStatus || (exports.CorralWorkSessionStatus = CorralWorkSessionStatus = {}));
var CorralSessionSourceType;
(function (CorralSessionSourceType) {
    CorralSessionSourceType["PADDOCK"] = "PADDOCK";
    CorralSessionSourceType["FILTER"] = "FILTER";
    CorralSessionSourceType["MANUAL"] = "MANUAL";
})(CorralSessionSourceType || (exports.CorralSessionSourceType = CorralSessionSourceType = {}));
var CorralVisualConditionCode;
(function (CorralVisualConditionCode) {
    CorralVisualConditionCode["NORMAL"] = "NORMAL";
    CorralVisualConditionCode["THIN"] = "THIN";
    CorralVisualConditionCode["VERY_THIN"] = "VERY_THIN";
    CorralVisualConditionCode["FAT"] = "FAT";
    CorralVisualConditionCode["VERY_FAT"] = "VERY_FAT";
    CorralVisualConditionCode["PREGNANT"] = "PREGNANT";
    CorralVisualConditionCode["CLOSE_TO_CALVING"] = "CLOSE_TO_CALVING";
    CorralVisualConditionCode["SICK"] = "SICK";
    CorralVisualConditionCode["INJURED"] = "INJURED";
})(CorralVisualConditionCode || (exports.CorralVisualConditionCode = CorralVisualConditionCode = {}));
exports.CORRAL_VISUAL_CONDITION_CODES = Object.values(CorralVisualConditionCode);
var CorralStepWorkMode;
(function (CorralStepWorkMode) {
    CorralStepWorkMode["SCAN_DYNAMIC"] = "SCAN_DYNAMIC";
    CorralStepWorkMode["PRELOADED_SEARCH"] = "PRELOADED_SEARCH";
    CorralStepWorkMode["PRELOADED_QUEUE"] = "PRELOADED_QUEUE";
})(CorralStepWorkMode || (exports.CorralStepWorkMode = CorralStepWorkMode = {}));
exports.CORRAL_STEP_WORK_MODES = Object.values(CorralStepWorkMode);
exports.CORRAL_PRELOADED_WORK_MODES = [
    CorralStepWorkMode.PRELOADED_SEARCH,
    CorralStepWorkMode.PRELOADED_QUEUE,
];
