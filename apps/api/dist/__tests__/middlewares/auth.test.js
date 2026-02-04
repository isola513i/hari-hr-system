"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../../middlewares/auth");
// Mock jwt
jest.mock('jsonwebtoken');
const mockedJwt = jsonwebtoken_1.default;
describe('Auth Middleware', () => {
    let mockRequest;
    let mockResponse;
    let mockNext;
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
            (0, auth_1.authenticateToken)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 403 when token is invalid', () => {
            mockRequest.headers = { authorization: 'Bearer invalid-token' };
            mockedJwt.verify.mockImplementation((token, secret, callback) => {
                callback(new Error('invalid token'), null);
            });
            (0, auth_1.authenticateToken)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should call next and set user when token is valid', () => {
            const mockUser = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE' };
            mockRequest.headers = { authorization: 'Bearer valid-token' };
            mockedJwt.verify.mockImplementation((token, secret, callback) => {
                callback(null, mockUser);
            });
            (0, auth_1.authenticateToken)(mockRequest, mockResponse, mockNext);
            expect(mockRequest.user).toEqual(mockUser);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('requireRole', () => {
        it('should return 401 when user not authenticated', () => {
            const middleware = (0, auth_1.requireRole)('HR_ADMIN');
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        });
        it('should return 403 when user does not have required role', () => {
            mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
            const middleware = (0, auth_1.requireRole)('HR_ADMIN');
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Access denied' }));
        });
        it('should call next when user has required role', () => {
            mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'HR_ADMIN', employeeId: 'emp-123' };
            const middleware = (0, auth_1.requireRole)('HR_ADMIN');
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should accept multiple roles', () => {
            mockRequest.user = { userId: 'user-123', email: 'test@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
            const middleware = (0, auth_1.requireRole)('HR_ADMIN', 'EMPLOYEE');
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
    describe('requireAdmin', () => {
        it('should call next for HR_ADMIN users', () => {
            mockRequest.user = { userId: 'user-123', email: 'admin@example.com', role: 'HR_ADMIN', employeeId: 'emp-123' };
            (0, auth_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 for non-admin users', () => {
            mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
            (0, auth_1.requireAdmin)(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
        });
    });
    describe('requireOwnerOrAdmin', () => {
        it('should call next when user is resource owner', () => {
            mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
            mockRequest.params = { id: 'emp-123' };
            const middleware = (0, auth_1.requireOwnerOrAdmin)((req) => { var _a; return ((_a = req.params) === null || _a === void 0 ? void 0 : _a.id) || null; });
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should call next when user is admin', () => {
            mockRequest.user = { userId: 'user-123', email: 'admin@example.com', role: 'HR_ADMIN', employeeId: 'admin-emp' };
            mockRequest.params = { id: 'emp-456' };
            const middleware = (0, auth_1.requireOwnerOrAdmin)((req) => { var _a; return ((_a = req.params) === null || _a === void 0 ? void 0 : _a.id) || null; });
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
        it('should return 403 when user is not owner and not admin', () => {
            mockRequest.user = { userId: 'user-123', email: 'user@example.com', role: 'EMPLOYEE', employeeId: 'emp-123' };
            mockRequest.params = { id: 'emp-456' };
            const middleware = (0, auth_1.requireOwnerOrAdmin)((req) => { var _a; return ((_a = req.params) === null || _a === void 0 ? void 0 : _a.id) || null; });
            middleware(mockRequest, mockResponse, mockNext);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Access denied' }));
        });
    });
});
