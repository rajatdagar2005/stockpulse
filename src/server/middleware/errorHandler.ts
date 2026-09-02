import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error(`[Error] ${req.method} ${req.path}:`, err);

  // Zod validation error
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    const messages: string[] = [];
    err.issues.forEach((e) => {
      const field = e.path.join('.') || 'input';
      fieldErrors[field] = e.message;
      messages.push(e.message);
    });

    const primaryMessage = messages[0] || 'Validation failed. Please check the input fields.';

    return res.status(400).json({
      success: false,
      message: primaryMessage,
      errors: fieldErrors,
    });
  }

  // PostgreSQL duplicate key constraint
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique identifier (e.g. SKU, Email, or Order Number) already exists.',
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced related record (e.g. Supplier or Product) does not exist or cannot be deleted.',
    });
  }

  // PostgreSQL check constraint violation
  if (err.code === '23514') {
    return res.status(400).json({
      success: false,
      message: 'Data check constraint violated (e.g. negative stock or negative price not allowed).',
    });
  }

  const statusCode = err.statusCode || (err.message && err.message.includes('not found') ? 404 : 400);

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred. Please try again.',
  });
}
