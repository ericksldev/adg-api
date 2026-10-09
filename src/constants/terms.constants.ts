/**
 * Identity of the first published contract.
 * Runtime access checks read the active row from terms_versions.
 * These constants are used only to seed that row once.
 */
export const INITIAL_TERMS_VERSION = '1.0';

export const INITIAL_TERMS_TITLE = 'Condiciones de Servicio y Aceptación de Membresía';

export const INITIAL_TERMS_EFFECTIVE_AT = '2026-10-08T00:00:00.000Z';

/** Spanish label written into the seeded document in place of the [FECHA] placeholder. */
export const INITIAL_TERMS_UPDATED_LABEL = '8 de octubre de 2026';

export const TERMS_VERSION_CODE_PATTERN = /^\d+\.\d+(\.\d+)?$/;

export const TERMS_CONTENT_MIN_LENGTH = 40;

export const TERMS_CONTENT_MAX_LENGTH = 100000;

export const TERMS_IP_MAX_LENGTH = 128;

export const TERMS_USER_AGENT_MAX_LENGTH = 512;
