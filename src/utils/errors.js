/**
 * Custom error classes for consistent error handling across the application
 */

/**
 * Base error class for all application errors
 */
export class OlmstedError extends Error {
  constructor(message, code = 'OLMSTED_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for data validation failures
 */
export class ValidationError extends OlmstedError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
  }
}

/**
 * Error for file processing operations
 */
export class FileProcessingError extends OlmstedError {
  constructor(message, filename = null, originalError = null) {
    super(message, 'FILE_PROCESSING_ERROR');
    this.filename = filename;
    this.originalError = originalError;
  }
}

/**
 * Error for database operations
 */
export class DatabaseError extends OlmstedError {
  constructor(message, operation = null, originalError = null) {
    super(message, 'DATABASE_ERROR');
    this.operation = operation;
    this.originalError = originalError;
  }
}

/**
 * Error for network operations
 */
export class NetworkError extends OlmstedError {
  constructor(message, url = null, status = null) {
    super(message, 'NETWORK_ERROR');
    this.url = url;
    this.status = status;
  }
}

/**
 * Error logger utility
 */
export class ErrorLogger {
  static log(error, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        code: error.code || 'UNKNOWN',
        stack: error.stack
      },
      context
    };
    
    // Log to console with appropriate level
    if (error instanceof ValidationError) {
      console.warn('Validation Error:', logData);
    } else if (error instanceof NetworkError) {
      console.error('Network Error:', logData);
    } else {
      console.error('Application Error:', logData);
    }
    
    // In production, you might want to send to a logging service
    // Example: sendToLoggingService(logData);
  }
  
  static warn(message, context = {}) {
    console.warn(`[${new Date().toISOString()}] ${message}`, context);
  }
  
  static info(message, context = {}) {
    console.log(`[${new Date().toISOString()}] ${message}`, context);
  }
}

/**
 * Utility to wrap async functions with consistent error handling
 */
export function withErrorHandling(asyncFn, context = {}) {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      ErrorLogger.log(error, { ...context, args });
      throw error;
    }
  };
}

/**
 * Utility to create fail-fast validation
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  return value;
}

export function validateType(value, expectedType, fieldName) {
  if (typeof value !== expectedType) {
    throw new ValidationError(
      `${fieldName} must be of type ${expectedType}, got ${typeof value}`,
      fieldName
    );
  }
  return value;
}

export function validateArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName);
  }
  return value;
}