"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TENANT_POOL_MAX = exports.TENANT_SCHEMA_VERSION = exports.TENANT_DB_SAFE_NAME_REGEX = exports.TENANT_DB_NAME_PREFIX = void 0;
exports.TENANT_DB_NAME_PREFIX = 'tenant';
exports.TENANT_DB_SAFE_NAME_REGEX = /^\w+$/;
/** Bump when tenant DDL changes; used with company.tenant_schema_version. */
exports.TENANT_SCHEMA_VERSION = 4;
exports.DEFAULT_TENANT_POOL_MAX = 32;
