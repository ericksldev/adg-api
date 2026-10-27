import express from 'express';
import cors from 'cors';
import routes from './routes';
import errorHandler from './middlewares/error.middleware';
import corsOptions from './config/cors.config';

/** One animal-batch chunk is at most 500 rows. The Express default (100kb) rejects those payloads. */
const JSON_BODY_LIMIT = '1mb';

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
