/**
 * @gof/api-contracts — contratos HTTP multiplataforma (stub 31.0).
 */

export type ApiErrorCode =
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "UNKNOWN";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  requestId: string;
  status: number;
};

export type ApiFailure = {
  ok: false;
  error: ApiErrorBody;
  status: number;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export const API_HEADERS = {
  tenant: "x-gof-tenant-id",
  branch: "x-gof-branch-id",
  requestId: "x-gof-request-id",
  clientVersion: "x-gof-client-version",
} as const;

export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_GET_RETRIES = 2;
