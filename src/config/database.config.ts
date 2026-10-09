import { envConfig } from './env.config';
import { getSequelizeDialectOptions } from './postgres-ssl.config';

const databaseConfig = {
    user: envConfig.DB_USER,
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME,
    host: envConfig.DB_HOST,
    port: envConfig.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions: getSequelizeDialectOptions(),
};

export default databaseConfig;