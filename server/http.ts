import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function asyncRoute(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Gönderilen bilgiler geçersiz.', issues: error.issues });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ code: error.code, message: error.message });
  }
  if (error instanceof Error && error.message === 'CLOUD_NOT_CONFIGURED') {
    return res.status(503).json({ code: 'CLOUD_NOT_CONFIGURED', message: 'Supabase bağlantısı henüz yapılandırılmadı.' });
  }
  console.error('Unhandled server error', error);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'İşlem tamamlanamadı.' });
}
