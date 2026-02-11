import {
  OlmstedError,
  ValidationError,
  FileProcessingError,
  DatabaseError,
  NetworkError,
  ErrorLogger,
  withErrorHandling,
  validateRequired,
  validateType,
  validateArray
} from "../errors";

describe("OlmstedError", () => {
  it("creates error with message and default code", () => {
    const err = new OlmstedError("something failed");
    expect(err.message).toBe("something failed");
    expect(err.code).toBe("OLMSTED_ERROR");
    expect(err.name).toBe("OlmstedError");
  });

  it("creates error with custom code", () => {
    const err = new OlmstedError("fail", "CUSTOM_CODE");
    expect(err.code).toBe("CUSTOM_CODE");
  });

  it("has a timestamp", () => {
    const err = new OlmstedError("test");
    expect(err.timestamp).toBeDefined();
    expect(new Date(err.timestamp).getTime()).not.toBeNaN();
  });

  it("is an instance of Error", () => {
    const err = new OlmstedError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("ValidationError", () => {
  it("has VALIDATION_ERROR code", () => {
    const err = new ValidationError("bad input");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.name).toBe("ValidationError");
  });

  it("stores field name", () => {
    const err = new ValidationError("bad input", "email");
    expect(err.field).toBe("email");
  });

  it("defaults field to null", () => {
    const err = new ValidationError("bad input");
    expect(err.field).toBeNull();
  });

  it("is an instance of OlmstedError", () => {
    expect(new ValidationError("test")).toBeInstanceOf(OlmstedError);
  });
});

describe("FileProcessingError", () => {
  it("has FILE_PROCESSING_ERROR code", () => {
    const err = new FileProcessingError("parse failed");
    expect(err.code).toBe("FILE_PROCESSING_ERROR");
  });

  it("stores filename and original error", () => {
    const original = new Error("original");
    const err = new FileProcessingError("parse failed", "data.json", original);
    expect(err.filename).toBe("data.json");
    expect(err.originalError).toBe(original);
  });
});

describe("DatabaseError", () => {
  it("has DATABASE_ERROR code", () => {
    const err = new DatabaseError("db down");
    expect(err.code).toBe("DATABASE_ERROR");
  });

  it("stores operation and original error", () => {
    const err = new DatabaseError("db down", "INSERT", new Error("timeout"));
    expect(err.operation).toBe("INSERT");
    expect(err.originalError).toBeInstanceOf(Error);
  });
});

describe("NetworkError", () => {
  it("has NETWORK_ERROR code", () => {
    const err = new NetworkError("timeout");
    expect(err.code).toBe("NETWORK_ERROR");
  });

  it("stores url and status", () => {
    const err = new NetworkError("not found", "https://api.example.com", 404);
    expect(err.url).toBe("https://api.example.com");
    expect(err.status).toBe(404);
  });
});

describe("ErrorLogger", () => {
  let warnSpy, errorSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("logs ValidationError as warning", () => {
    ErrorLogger.log(new ValidationError("bad"));
    expect(warnSpy).toHaveBeenCalled();
  });

  it("logs NetworkError as error", () => {
    ErrorLogger.log(new NetworkError("fail"));
    expect(errorSpy).toHaveBeenCalled();
  });

  it("logs generic errors as error", () => {
    ErrorLogger.log(new OlmstedError("fail"));
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("withErrorHandling", () => {
  it("wraps an async function and re-throws errors", async () => {
    const fn = async () => {
      throw new Error("boom");
    };
    const wrapped = withErrorHandling(fn);
    await expect(wrapped()).rejects.toThrow("boom");
  });

  it("returns the value from a successful function", async () => {
    const fn = async () => 42;
    const wrapped = withErrorHandling(fn);
    await expect(wrapped()).resolves.toBe(42);
  });
});

describe("validateRequired", () => {
  it("throws ValidationError for null", () => {
    expect(() => validateRequired(null, "name")).toThrow(ValidationError);
  });

  it("throws ValidationError for undefined", () => {
    expect(() => validateRequired(undefined, "name")).toThrow(ValidationError);
  });

  it("throws ValidationError for empty string", () => {
    expect(() => validateRequired("", "name")).toThrow(ValidationError);
  });

  it("returns value for valid input", () => {
    expect(validateRequired("hello", "name")).toBe("hello");
  });

  it("returns 0 (not considered empty)", () => {
    expect(validateRequired(0, "count")).toBe(0);
  });
});

describe("validateType", () => {
  it("throws ValidationError for wrong type", () => {
    expect(() => validateType(42, "string", "name")).toThrow(ValidationError);
  });

  it("returns value for correct type", () => {
    expect(validateType("hello", "string", "name")).toBe("hello");
  });

  it("validates number type", () => {
    expect(validateType(42, "number", "count")).toBe(42);
  });
});

describe("validateArray", () => {
  it("throws ValidationError for non-array", () => {
    expect(() => validateArray("not an array", "items")).toThrow(ValidationError);
  });

  it("throws ValidationError for object", () => {
    expect(() => validateArray({}, "items")).toThrow(ValidationError);
  });

  it("returns value for array", () => {
    const arr = [1, 2, 3];
    expect(validateArray(arr, "items")).toBe(arr);
  });

  it("returns value for empty array", () => {
    expect(validateArray([], "items")).toEqual([]);
  });
});
