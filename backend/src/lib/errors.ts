export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, msg: string, details?: unknown) => new HttpError(400, code, msg, details);
export const unauthorized = (msg = "Faça login para continuar.") => new HttpError(401, "UNAUTHORIZED", msg);
export const forbidden = (msg = "Você não tem permissão para isso.") => new HttpError(403, "FORBIDDEN", msg);
export const notFound = (msg = "Não encontrado.") => new HttpError(404, "NOT_FOUND", msg);
export const conflict = (code: string, msg: string) => new HttpError(409, code, msg);
