import { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types';

export interface NormalizedError {
  code: string;
  message: string;
  status?: number;
  details?: Array<{ path?: string; message: string }>;
}

/** Normalize any thrown value (Axios error, Error, unknown) into a usable shape. */
export function normalizeError(error: unknown): NormalizedError {
  const axiosErr = error as AxiosError<ApiErrorBody>;

  if (axiosErr?.isAxiosError) {
    const body = axiosErr.response?.data;
    if (body && typeof body === 'object' && 'error' in body && body.error) {
      return {
        code: body.error.code || 'INTERNAL',
        message: body.error.message || 'Something went wrong',
        status: axiosErr.response?.status,
        details: Array.isArray(body.error.details)
          ? (body.error.details as Array<{ path?: string; message: string }>)
          : undefined,
      };
    }
    if (axiosErr.code === 'ERR_NETWORK') {
      return {
        code: 'NETWORK',
        message: 'Cannot reach the server. Check your connection.',
        status: 0,
      };
    }
    return {
      code: 'INTERNAL',
      message: axiosErr.message || 'Request failed',
      status: axiosErr.response?.status,
    };
  }

  if (error instanceof Error) {
    return { code: 'INTERNAL', message: error.message };
  }
  return { code: 'INTERNAL', message: 'Unexpected error' };
}

export function getErrorMessage(error: unknown): string {
  return normalizeError(error).message;
}
