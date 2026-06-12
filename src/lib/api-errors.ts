export class ApiForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ApiForbiddenError";
  }
}

export class ApiUnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "ApiUnauthorizedError";
  }
}

export function isApiForbiddenError(error: unknown): error is ApiForbiddenError {
  return error instanceof ApiForbiddenError;
}
