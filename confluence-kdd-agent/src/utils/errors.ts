export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConfluenceError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, statusCode, 'CONFLUENCE_ERROR');
    this.name = 'ConfluenceError';
  }
}

export class OllamaError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, statusCode, 'OLLAMA_ERROR');
    this.name = 'OllamaError';
  }
}

export function handleError(error: unknown): { message: string; statusCode: number; code: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      statusCode: 500,
      code: 'INTERNAL_ERROR',
    };
  }

  return {
    message: 'An unknown error occurred',
    statusCode: 500,
    code: 'UNKNOWN_ERROR',
  };
}
