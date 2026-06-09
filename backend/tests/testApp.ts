import 'dotenv/config';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from '../src/routes';
import { AppError } from '../src/utils/errors';
import { serverError, error as errorResponse } from '../src/utils/response';

const app: Express = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api', routes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    timestamp: Date.now(),
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    errorResponse(res, err.message, err.errorCode, err.httpStatus);
  } else {
    serverError(res, err.message);
  }
});

export default app;
