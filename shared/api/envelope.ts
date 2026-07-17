import type { ErrorCode } from '../constants/index';

/** Standard success/error envelope returned by every API endpoint. */
export interface ApiMeta {
  requestId?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiError {
  code: ErrorCode | string;
  message: string;
  fields?: Record<string, string[]>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
  error: null;
}

export interface ApiFailure {
  success: false;
  data: null;
  meta: ApiMeta;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface Paginated<T> {
  items: T[];
}
