import { envConfig } from './env.config';
import { getPostgresSsl } from './postgres-ssl.config';

const pgConfig = {
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    ssl: getPostgresSsl(),
};

export default pgConfig;