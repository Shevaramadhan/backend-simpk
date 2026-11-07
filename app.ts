import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import env from './config/env';
import { errorHandler, notFound } from './middlewares/error.middleware';
import routes from './routes';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
