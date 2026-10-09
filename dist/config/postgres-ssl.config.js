"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSequelizeDialectOptions = exports.getPostgresSsl = exports.RDS_CA_BUNDLE_PATH = void 0;
const fs_1 = __importDefault(require("fs"));
const env_config_1 = require("./env.config");
/** Path baked into the production image (see vrete-api/Dockerfile). */
exports.RDS_CA_BUNDLE_PATH = '/app/certs/global-bundle.pem';
let cachedCaBundle;
const loadRdsCaBundle = () => {
    if (cachedCaBundle !== undefined) {
        return cachedCaBundle;
    }
    try {
        cachedCaBundle = fs_1.default.readFileSync(exports.RDS_CA_BUNDLE_PATH, 'utf8');
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Production PostgreSQL SSL requires the Amazon RDS CA bundle at ${exports.RDS_CA_BUNDLE_PATH}. ${detail}`);
    }
    if (!cachedCaBundle.includes('BEGIN CERTIFICATE')) {
        throw new Error(`Amazon RDS CA bundle at ${exports.RDS_CA_BUNDLE_PATH} is empty or invalid.`);
    }
    return cachedCaBundle;
};
/**
 * Single SSL policy for every PostgreSQL client (Sequelize and pg).
 * Development: TLS off (local Docker Postgres has no SSL).
 * Production: TLS required, Amazon RDS CA, rejectUnauthorized true.
 */
const getPostgresSsl = () => {
    if (env_config_1.envConfig.NODE_ENV !== 'production') {
        return false;
    }
    return {
        rejectUnauthorized: true,
        ca: loadRdsCaBundle(),
    };
};
exports.getPostgresSsl = getPostgresSsl;
const getSequelizeDialectOptions = () => {
    const ssl = (0, exports.getPostgresSsl)();
    if (ssl === false) {
        return { ssl: false };
    }
    return {
        ssl: {
            require: true,
            rejectUnauthorized: true,
            ca: ssl.ca,
        },
    };
};
exports.getSequelizeDialectOptions = getSequelizeDialectOptions;
