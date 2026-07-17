import { ERROR_CODES, type ErrorCode } from '../../shared/constants/index';

/** Typed application error carrying an HTTP status, error code, and optional field errors. */
export class ApiException extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;
  readonly fields?: Record<string, string[]>;

  constructor(
    status: number,
    code: ErrorCode | string,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const badRequest = (message: string, fields?: Record<string, string[]>) =>
  new ApiException(400, ERROR_CODES.VALIDATION_ERROR, message, fields);

export const unauthorized = (message = 'Authentication required.') =>
  new ApiException(401, ERROR_CODES.UNAUTHORIZED, message);

export const forbidden = (message = 'You do not have permission to do that.') =>
  new ApiException(403, ERROR_CODES.FORBIDDEN, message);

export const notFound = (message = 'Not found.') =>
  new ApiException(404, ERROR_CODES.NOT_FOUND, message);

export const conflict = (message: string) =>
  new ApiException(409, ERROR_CODES.CONFLICT, message);

export const rateLimited = (message = 'Too many requests. Please try again shortly.') =>
  new ApiException(429, ERROR_CODES.RATE_LIMITED, message);
