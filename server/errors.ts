/**
 * Erros com código fixo: o front-end decide a mensagem e a ação
 * (ex.: INSUFFICIENT_CREDITS abre o aviso de créditos) sem adivinhar texto.
 */
import type { ApiErrorCode } from '../shared/contracts';

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  INVALID_INPUT: 400,
  INSUFFICIENT_CREDITS: 402,
  NOT_CONFIGURED: 503,
  GENERATION_FAILED: 502,
  SAFETY_BLOCKED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
  }
}
