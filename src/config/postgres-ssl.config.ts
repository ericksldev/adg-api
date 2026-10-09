import fs from 'fs';
import { envConfig } from './env.config';

/** Path baked into the production image (see vrete-api/Dockerfile). */
export const RDS_CA_BUNDLE_PATH = '/app/certs/global-bundle.pem';

export type PostgresSslOptions =
    | false
    | {
          rejectUnauthorized: true;
          ca: string;
      };

export type SequelizeDialectOptions = {
    ssl:
        | false
        | {
              require: true;
              rejectUnauthorized: true;
              ca: string;
          };
};

let cachedCaBundle: string | undefined;

const loadRdsCaBundle = (): string => {
    if (cachedCaBundle !== undefined) {
        return cachedCaBundle;
    }

    try {
        cachedCaBundle = fs.readFileSync(RDS_CA_BUNDLE_PATH, 'utf8');
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
            `Production PostgreSQL SSL requires the Amazon RDS CA bundle at ${RDS_CA_BUNDLE_PATH}. ${detail}`
        );
    }

    if (!cachedCaBundle.includes('BEGIN CERTIFICATE')) {
        throw new Error(`Amazon RDS CA bundle at ${RDS_CA_BUNDLE_PATH} is empty or invalid.`);
    }

    return cachedCaBundle;
};

/**
 * Single SSL policy for every PostgreSQL client (Sequelize and pg).
 * Development: TLS off (local Docker Postgres has no SSL).
 * Production: TLS required, Amazon RDS CA, rejectUnauthorized true.
 */
export const getPostgresSsl = (): PostgresSslOptions => {
    if (envConfig.NODE_ENV !== 'production') {
        return false;
    }

    return {
        rejectUnauthorized: true,
        ca: loadRdsCaBundle(),
    };
};

export const getSequelizeDialectOptions = (): SequelizeDialectOptions => {
    const ssl = getPostgresSsl();
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
