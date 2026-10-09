import { MembershipStatus } from '../../constants/domain.constants';

export type TermsBlockReason =
    | 'none'
    | 'acceptance_required'
    | 'organization_missing'
    | 'membership_invalid'
    | 'terms_unavailable';

export interface TermsVersionAttributes {
    uuid_terms_version: string;
    version: string;
    title: string;
    content: string;
    effective_at: Date;
    is_active: boolean;
    requires_acceptance: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface TermsVersionCreationAttributes {
    version: string;
    title: string;
    content: string;
    effective_at: Date;
    is_active?: boolean;
    requires_acceptance: boolean;
}

export interface TermsVersionSummary {
    uuid_terms_version: string;
    version: string;
    title: string;
    effective_at: Date;
    updated_at: Date;
    is_active: boolean;
    requires_acceptance: boolean;
}

export interface TermsAcceptanceAttributes {
    uuid_terms_acceptance: string;
    uuid_user: string;
    uuid_company: string;
    uuid_terms_version: string;
    accepted_at: Date;
    ip_address: string | null;
    user_agent: string | null;
    created_at?: Date;
    updated_at?: Date;
}

export interface TermsAcceptanceCreationAttributes {
    uuid_user: string;
    uuid_company: string;
    uuid_terms_version: string;
    accepted_at: Date;
    ip_address: string | null;
    user_agent: string | null;
}

export interface CompanyMembershipSnapshot {
    uuid_company: string;
    is_active: boolean;
    membership_status: MembershipStatus;
    membership_renewal_at: Date | null;
}

export interface TermsAccessDecision {
    access_granted: boolean;
    acceptance_required: boolean;
    accepted: boolean;
    block_reason: TermsBlockReason;
    current_version: TermsVersionSummary | null;
}

export interface TermsAcceptCommand {
    uuid_user: string;
    uuid_company: string;
    uuid_terms_version: string;
    accepted: boolean;
    ip_address?: string | null;
    user_agent?: string | null;
}

export interface TermsAcceptResult {
    acceptance: TermsAcceptanceAttributes;
    already_recorded: boolean;
    access: TermsAccessDecision;
}

export interface TermsVersionWriteBody {
    version?: string;
    title?: string;
    content?: string;
    effective_at?: string;
    requires_acceptance?: boolean;
    publish?: boolean;
}
