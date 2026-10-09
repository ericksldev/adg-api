import { envConfig } from "./env.config";

const configuredSecret = envConfig.JWT_SECRET?.trim() ?? '';

if (envConfig.NODE_ENV === 'production' && !configuredSecret) {
    throw new Error('JWT_SECRET is required when NODE_ENV=production');
}

const jwtConfig = {
    secret: configuredSecret || 'fallback-secret',
    expiresIn: '1h',
}

export default jwtConfig;
