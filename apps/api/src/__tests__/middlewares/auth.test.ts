import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole, requireAdmin, requireOwnerOrAdmin } from '../../middlewares/auth';

// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should return 401 when no token provided', () => {
      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when token is invalid', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      (mockedJwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(new Error('invalid token'), null);
      });

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next and set user when token is valid', () => {
      const mockUser = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE' };
      mockRequest.headers = { authorization: 'Bearer valid-token' };
      (mockedJwt.verify as jest.Mock).mockImplementation((token, secret, callback) => {
        callback(null, mockUser);
      });

      authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should return 401 when user not authenticated', () => {
      const middleware = requireRole('HR_ADMIN');

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });

    it('should return 403 when user does not have required role', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
      const middleware = requireRole('HR_ADMIN');

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Access denied' })
      );
    });

    it('should call next when user has required role', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'HR_ADMIN', employeeId: 'emp-123' };
      const middleware = requireRole('HR_ADMIN');

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should accept multiple roles', () => {
      mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
      const middleware = requireRole('HR_ADMIN', 'EMPLOYEE');

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should call next for HR_ADMIN users', () => {
      mockRequest.user = { userId: 'user-123', email: 'admin@example.com', role: 'HR_ADMIN', employeeId: 'emp-123' };

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for non-admin users', () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };

      requireAdmin(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireOwnerOrAdmin', () => {
    it('should call next when user is resource owner', () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
      mockRequest.params = { id: 'emp-123' };

      const middleware = requireOwnerOrAdmin((req) => req.params?.id || null);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next when user is admin', () => {
      mockRequest.user = { userId: 'user-123', email: 'admin@example.com', role: 'HR_ADMIN', employeeId: 'admin-emp' };
      mockRequest.params = { id: 'emp-456' };

      const middleware = requireOwnerOrAdmin((req) => req.params?.id || null);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user is not owner and not admin', () => {
      mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
      mockRequest.params = { id: 'emp-456' };

      const middleware = requireOwnerOrAdmin((req) => req.params?.id || null);

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Access denied' })
      );
    });
  });
});
