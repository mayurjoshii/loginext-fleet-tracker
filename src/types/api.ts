/**
 * Every REST endpoint answers with the same `{ success, ... }` envelope.
 * Services unwrap `data` and throw on `success: false`, so components never
 * see these types.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp?: string;
}

/** List endpoints carry the result count alongside `data`. */
export interface ApiListSuccess<T> extends ApiSuccess<T[]> {
  total: number;
}

/** The status-filtered list endpoint echoes the status it filtered on. */
export interface ApiStatusListSuccess<T> extends ApiListSuccess<T> {
  status: string;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiListResponse<T> = ApiListSuccess<T> | ApiError;
export type ApiStatusListResponse<T> = ApiStatusListSuccess<T> | ApiError;
