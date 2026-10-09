import { Optional } from 'sequelize';
import { SaasPlanResourceCode } from '../../constants/saas-plan.constants';

export interface SaasPlanLimitValues {
    USERS: number | null;
    ANIMALS: number | null;
    ACTIVITY_RECORDS: number | null;
}

export interface SaasPlanAttributes {
    uuid_plan: string;
    code: string;
    name: string;
    description?: string | null;
    annual_price: number;
    currency: string;
    is_active: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export type SaasPlanCreationAttributes = Optional<
    SaasPlanAttributes,
    'uuid_plan' | 'description' | 'currency' | 'is_active' | 'created_at' | 'updated_at'
>;

export interface SaasPlanLimitAttributes {
    uuid_plan: string;
    resource_code: string;
    max_value: number;
}

export interface SaasPlanView {
    uuid_plan: string;
    code: string;
    name: string;
    description: string | null;
    annual_price: number;
    currency: string;
    is_active: boolean;
    limits: SaasPlanLimitValues;
    created_at?: Date;
    updated_at?: Date;
}

export interface SaasPlanWriteBody {
    code?: string;
    name?: string;
    description?: string | null;
    annual_price?: number;
    currency?: string;
    is_active?: boolean;
    max_users?: number;
    max_animals?: number;
    max_activity_records?: number;
}

export interface CompanyPlanSummary {
    uuid_plan: string;
    code: string;
    name: string;
    description: string | null;
    annual_price: number;
    currency: string;
    is_active: boolean;
    limits: SaasPlanLimitValues;
}

export const LIMIT_FIELD_BY_RESOURCE: Record<SaasPlanResourceCode, keyof Pick<
    SaasPlanWriteBody,
    'max_users' | 'max_animals' | 'max_activity_records'
>> = {
    USERS: 'max_users',
    ANIMALS: 'max_animals',
    ACTIVITY_RECORDS: 'max_activity_records',
};
