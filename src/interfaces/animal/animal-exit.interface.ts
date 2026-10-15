import { AnimalAttributes } from './animal.interface';
import { AnimalDisposalAttributes } from './animal-operations.interface';
import { AnimalExitType } from '../../constants/animal-exit.constants';

export interface AnimalDeactivateRequestBody {
    exit_type: AnimalExitType;
    /** ISO date or datetime; normalized server-side. */
    exit_date: string;
    reason?: string | null;
    description?: string | null;
}

export interface AnimalDeactivateBatchRowInput extends AnimalDeactivateRequestBody {
    animal_uuid: string;
}

export interface AnimalDeactivateBatchRequestBody {
    rows: AnimalDeactivateBatchRowInput[];
}

export interface AnimalDeactivateResult {
    animal: AnimalAttributes;
    disposal: AnimalDisposalAttributes;
}

export interface AnimalDeactivateBatchRowResult {
    animal_uuid: string;
    success: boolean;
    error?: string;
}

export interface AnimalDeactivateBatchResult {
    requested: number;
    success: number;
    failed: number;
    rows: AnimalDeactivateBatchRowResult[];
}

export interface AnimalListItemWithExit extends AnimalAttributes {
    last_exit?: {
        disposal_uuid: string;
        exit_type: string;
        exit_date: Date;
        reason?: string | null;
        description?: string | null;
    } | null;
    categories?: { category_uuid: string; name?: string }[];
}
