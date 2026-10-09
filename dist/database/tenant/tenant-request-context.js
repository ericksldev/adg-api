"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantRequestStorage = void 0;
exports.requireTenantModels = requireTenantModels;
exports.requireTenantSequelize = requireTenantSequelize;
const node_async_hooks_1 = require("node:async_hooks");
const apiError_1 = __importDefault(require("../../errors/apiError"));
const httpStatusCodes_1 = __importDefault(require("../../errors/httpStatusCodes"));
exports.tenantRequestStorage = new node_async_hooks_1.AsyncLocalStorage();
function requireTenantModels() {
    const store = exports.tenantRequestStorage.getStore();
    if (!store?.models) {
        throw new apiError_1.default({
            name: 'InternalError',
            statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
            description: 'Tenant operational context is not initialized for this request',
        });
    }
    return store.models;
}
function requireTenantSequelize() {
    const store = exports.tenantRequestStorage.getStore();
    if (!store?.sequelize) {
        throw new apiError_1.default({
            name: 'InternalError',
            statusCode: httpStatusCodes_1.default.INTERNAL_SERVER_ERROR,
            description: 'Tenant operational context is not initialized for this request',
        });
    }
    return store.sequelize;
}
