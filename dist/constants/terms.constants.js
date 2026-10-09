"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERMS_USER_AGENT_MAX_LENGTH = exports.TERMS_IP_MAX_LENGTH = exports.TERMS_CONTENT_MAX_LENGTH = exports.TERMS_CONTENT_MIN_LENGTH = exports.TERMS_VERSION_CODE_PATTERN = exports.INITIAL_TERMS_UPDATED_LABEL = exports.INITIAL_TERMS_EFFECTIVE_AT = exports.INITIAL_TERMS_TITLE = exports.INITIAL_TERMS_VERSION = void 0;
/**
 * Identity of the first published contract.
 * Runtime access checks read the active row from terms_versions.
 * These constants are used only to seed that row once.
 */
exports.INITIAL_TERMS_VERSION = '1.0';
exports.INITIAL_TERMS_TITLE = 'Condiciones de Servicio y Aceptación de Membresía';
exports.INITIAL_TERMS_EFFECTIVE_AT = '2026-10-08T00:00:00.000Z';
/** Spanish label written into the seeded document in place of the [FECHA] placeholder. */
exports.INITIAL_TERMS_UPDATED_LABEL = '8 de octubre de 2026';
exports.TERMS_VERSION_CODE_PATTERN = /^\d+\.\d+(\.\d+)?$/;
exports.TERMS_CONTENT_MIN_LENGTH = 40;
exports.TERMS_CONTENT_MAX_LENGTH = 100000;
exports.TERMS_IP_MAX_LENGTH = 128;
exports.TERMS_USER_AGENT_MAX_LENGTH = 512;
