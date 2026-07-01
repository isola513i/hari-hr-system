import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  BusinessError,
  safeErrorMessage,
} from '../../utils/errorResponse';

describe('error hierarchy', () => {
  it('maps each subclass to the right status code', () => {
    expect(new ValidationError().statusCode).toBe(400);
    expect(new UnauthorizedError().statusCode).toBe(401);
    expect(new ForbiddenError().statusCode).toBe(403);
    expect(new NotFoundError().statusCode).toBe(404);
    expect(new ConflictError().statusCode).toBe(409);
    expect(new BusinessError('x').statusCode).toBe(400);
  });

  it('subclasses are instances of AppError and Error', () => {
    const e = new NotFoundError('nope');
    expect(e).toBeInstanceOf(AppError);
    expect(e).toBeInstanceOf(Error);
  });

  it('names the concrete subclass (except BusinessError keeps its legacy name)', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
    expect(new ConflictError().name).toBe('ConflictError');
    // Backward compat: existing `err.name === 'BusinessError'` checks still work
    expect(new BusinessError('x').name).toBe('BusinessError');
  });

  it('carries optional details for validation errors', () => {
    const details = [{ field: 'email', msg: 'required' }];
    expect(new ValidationError('bad', details).details).toEqual(details);
  });

  it('classifies 4xx as client-safe and 5xx as not', () => {
    expect(new NotFoundError().isClientSafe).toBe(true);
    expect(new AppError('boom', 500).isClientSafe).toBe(false);
  });

  describe('safeErrorMessage', () => {
    it('returns the message for client-safe errors', () => {
      expect(safeErrorMessage(new NotFoundError('gone'), 'fallback')).toBe('gone');
      expect(safeErrorMessage(new BusinessError('nope'), 'fallback')).toBe('nope');
    });
    it('masks 5xx and unknown errors with the fallback', () => {
      expect(safeErrorMessage(new AppError('leak', 500), 'fallback')).toBe('fallback');
      expect(safeErrorMessage(new Error('raw'), 'fallback')).toBe('fallback');
      expect(safeErrorMessage('a string', 'fallback')).toBe('fallback');
    });
  });
});
