import { ApiError, NotFoundError } from './errors';

describe('ApiError', () => {
  it('should create an instance of ApiError with message and status', () => {
    const error = new ApiError('Test API Error', 500);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test API Error');
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(500);
  });

  it('should correctly set the prototype chain', () => {
    const error = new ApiError('Another API Error', 400);
    expect(error instanceof ApiError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('should create an instance of NotFoundError with default message and status 404', () => {
    const error = new NotFoundError();
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Resource not found');
    expect(error.name).toBe('NotFoundError');
    expect(error.status).toBe(404);
  });

  it('should create an instance of NotFoundError with a custom message and status 404', () => {
    const error = new NotFoundError('Custom resource not found message');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Custom resource not found message');
    expect(error.name).toBe('NotFoundError');
    expect(error.status).toBe(404);
  });

  it('should correctly set the prototype chain for NotFoundError', () => {
    const error = new NotFoundError();
    expect(error instanceof NotFoundError).toBe(true);
    expect(error instanceof ApiError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});
