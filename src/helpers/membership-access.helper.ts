import { MembershipStatus } from '../constants/domain.constants';

/** Same grace window already applied when a renewal date lapses in authentication. */
export const MEMBERSHIP_GRACE_DAYS = 1;

const VALID_MEMBERSHIP_STATUSES: ReadonlySet<MembershipStatus> = new Set(['TRIAL', 'ACTIVE']);

export interface MembershipAccessSnapshot {
    is_active: boolean;
    membership_status: MembershipStatus | string;
    membership_renewal_at?: Date | string | null;
}

export function membershipGraceDeadline(renewalAt: Date): Date {
    const graceDeadline = new Date(renewalAt);
    graceDeadline.setDate(graceDeadline.getDate() + MEMBERSHIP_GRACE_DAYS);
    return graceDeadline;
}

export function isRenewalPastGrace(renewalAt: Date, now = Date.now()): boolean {
    return now > membershipGraceDeadline(renewalAt).getTime();
}

/**
 * A membership can carry terms of service when the organization is active,
 * the status is trial or paid, and the renewal date is still inside the grace window.
 * A missing renewal date does not invalidate the membership.
 */
export function hasValidMembership(company: MembershipAccessSnapshot, now = Date.now()): boolean {
    if (!company.is_active) {
        return false;
    }

    if (!VALID_MEMBERSHIP_STATUSES.has(company.membership_status as MembershipStatus)) {
        return false;
    }

    if (company.membership_renewal_at == null) {
        return true;
    }

    const renewal = company.membership_renewal_at instanceof Date
        ? company.membership_renewal_at
        : new Date(company.membership_renewal_at);

    if (Number.isNaN(renewal.getTime())) {
        return false;
    }

    return !isRenewalPastGrace(renewal, now);
}
