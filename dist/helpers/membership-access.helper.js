"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMBERSHIP_GRACE_DAYS = void 0;
exports.membershipGraceDeadline = membershipGraceDeadline;
exports.isRenewalPastGrace = isRenewalPastGrace;
exports.hasValidMembership = hasValidMembership;
/** Same grace window already applied when a renewal date lapses in authentication. */
exports.MEMBERSHIP_GRACE_DAYS = 1;
const VALID_MEMBERSHIP_STATUSES = new Set(['TRIAL', 'ACTIVE']);
function membershipGraceDeadline(renewalAt) {
    const graceDeadline = new Date(renewalAt);
    graceDeadline.setDate(graceDeadline.getDate() + exports.MEMBERSHIP_GRACE_DAYS);
    return graceDeadline;
}
function isRenewalPastGrace(renewalAt, now = Date.now()) {
    return now > membershipGraceDeadline(renewalAt).getTime();
}
/**
 * A membership can carry terms of service when the organization is active,
 * the status is trial or paid, and the renewal date is still inside the grace window.
 * A missing renewal date does not invalidate the membership.
 */
function hasValidMembership(company, now = Date.now()) {
    if (!company.is_active) {
        return false;
    }
    if (!VALID_MEMBERSHIP_STATUSES.has(company.membership_status)) {
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
