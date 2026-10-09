"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAnimalIdentifier = normalizeAnimalIdentifier;
exports.buildAnimalIdentifierExactMatchClause = buildAnimalIdentifierExactMatchClause;
const sequelize_1 = require("sequelize");
/**
 * Normalizes a scanned or typed animal identifier (registration / chip).
 */
function normalizeAnimalIdentifier(identifier) {
    return identifier.replace(/[\u0000-\u001F\u007F]/g, '').trim();
}
function escapeILikeExact(value) {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
/**
 * Case-insensitive exact match on registration_number or chip_number.
 */
function buildAnimalIdentifierExactMatchClause(identifier) {
    const normalized = normalizeAnimalIdentifier(identifier);
    if (!normalized) {
        return undefined;
    }
    const escaped = escapeILikeExact(normalized);
    return {
        [sequelize_1.Op.or]: [
            { registration_number: { [sequelize_1.Op.iLike]: escaped } },
            { chip_number: { [sequelize_1.Op.iLike]: escaped } },
        ],
    };
}
