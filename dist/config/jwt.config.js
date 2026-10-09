"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const env_config_1 = require("./env.config");
const configuredSecret = env_config_1.envConfig.JWT_SECRET?.trim() ?? '';
if (env_config_1.envConfig.NODE_ENV === 'production' && !configuredSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
}
const jwtConfig = {
    secret: configuredSecret || 'fallback-secret',
    expiresIn: '1h',
};
exports.default = jwtConfig;
