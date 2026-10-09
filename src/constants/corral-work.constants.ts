import {
  CORRAL_ACTIVITY_CATALOG,
  CORRAL_ACTIVITY_CODES,
  CORRAL_ACTIVITY_CODE_SET,
  CORRAL_ACTIVITY_COLUMN_LABELS,
  CORRAL_ACTIVITY_DEFAULT_WORK_MODES,
  CORRAL_ACTIVITY_HISTORY_TARGET,
  CORRAL_ACTIVITY_ICONS,
  CORRAL_ACTIVITY_VALUE_TYPES,
  CORRAL_MULTI_RECORD_ACTIVITY_CODES,
  getCorralActivityDefinition,
  isCorralActivityCode,
  isGridColumnActivity,
  isMultiRecordActivity,
  isPaddockMoveActivity,
  type CorralActivityCode as SharedCorralActivityCode,
  type CorralActivityDefaultWorkMode,
  type CorralActivityDefinition,
  type CorralActivityValueType
} from './corral-activities.constants';

export type CorralActivityCode = SharedCorralActivityCode;

export {
  CORRAL_ACTIVITY_CATALOG,
  CORRAL_ACTIVITY_CODES,
  CORRAL_ACTIVITY_CODE_SET,
  CORRAL_ACTIVITY_COLUMN_LABELS,
  CORRAL_ACTIVITY_DEFAULT_WORK_MODES,
  CORRAL_ACTIVITY_HISTORY_TARGET,
  CORRAL_ACTIVITY_ICONS,
  CORRAL_ACTIVITY_VALUE_TYPES,
  CORRAL_MULTI_RECORD_ACTIVITY_CODES,
  getCorralActivityDefinition,
  isCorralActivityCode,
  isGridColumnActivity,
  isMultiRecordActivity,
  isPaddockMoveActivity,
  type CorralActivityDefaultWorkMode,
  type CorralActivityDefinition,
  type CorralActivityValueType
};

/** Enum-like map for existing API code that references CorralActivityCode.ATTENDANCE. */
export const CorralActivityCode = CORRAL_ACTIVITY_CODES.reduce(
  (acc, code) => {
    acc[code] = code;
    return acc;
  },
  {} as Record<CorralActivityCode, CorralActivityCode>
);

export enum CorralWorkSessionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  CLOSED = 'CLOSED',
}

export enum CorralSessionSourceType {
  PADDOCK = 'PADDOCK',
  FILTER = 'FILTER',
  MANUAL = 'MANUAL',
}

export enum CorralVisualConditionCode {
  NORMAL = 'NORMAL',
  THIN = 'THIN',
  VERY_THIN = 'VERY_THIN',
  FAT = 'FAT',
  VERY_FAT = 'VERY_FAT',
  PREGNANT = 'PREGNANT',
  CLOSE_TO_CALVING = 'CLOSE_TO_CALVING',
  SICK = 'SICK',
  INJURED = 'INJURED',
}

export const CORRAL_VISUAL_CONDITION_CODES = Object.values(CorralVisualConditionCode);

export enum CorralStepWorkMode {
  SCAN_DYNAMIC = 'SCAN_DYNAMIC',
  PRELOADED_SEARCH = 'PRELOADED_SEARCH',
  PRELOADED_QUEUE = 'PRELOADED_QUEUE',
}

export const CORRAL_STEP_WORK_MODES = Object.values(CorralStepWorkMode);

export const CORRAL_PRELOADED_WORK_MODES = [
  CorralStepWorkMode.PRELOADED_SEARCH,
  CorralStepWorkMode.PRELOADED_QUEUE,
];
