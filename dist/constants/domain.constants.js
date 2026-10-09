"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_ROLES = exports.PAYMENT_METHODS = exports.PAYMENT_STATUSES = exports.MEMBERSHIP_STATUSES = exports.BILLING_CYCLES = void 0;
const roles_interface_1 = require("../interfaces/roles/roles.interface");
exports.BILLING_CYCLES = ['SEMESTRAL', 'ANNUAL'];
exports.MEMBERSHIP_STATUSES = ['TRIAL', 'ACTIVE', 'CANCELLED'];
exports.PAYMENT_STATUSES = ['POSTED', 'VOIDED'];
exports.PAYMENT_METHODS = ['bank_transfer', 'qr_payment', 'manual_payment'];
exports.USER_ROLES = [
    roles_interface_1.UserRole.SAAS_OWNER,
    roles_interface_1.UserRole.ADMINISTRATOR,
    roles_interface_1.UserRole.RANCH_STAFF,
];
