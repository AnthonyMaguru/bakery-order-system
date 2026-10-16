export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (what: string) => new HttpError(404, `${what} not found`);
export const forbidden = () => new HttpError(403, "Forbidden");
// The request is valid but clashes with the current state, e.g. a full day or a cancelled order.
export const conflict = (message: string) => new HttpError(409, message);
