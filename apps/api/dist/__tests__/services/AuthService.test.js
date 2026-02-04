"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const AuthService_1 = require("../../services/AuthService");
const db_1 = require("../../db");
// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
const mockedQuery = db_1.query;
const mockedBcrypt = bcrypt_1.default;
const mockedJwt = jsonwebtoken_1.default;
describe('AuthService', () => {
    let authService;
    beforeEach(() => {
        authService = new AuthService_1.AuthService();
        jest.clearAllMocks();
    });
    describe('login', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            password_hash: 'hashed-password',
            role: 'EMPLOYEE',
        };
        const mockEmployee = {
            id: 'emp-123',
            name: 'Test User',
            role: 'Developer',
            department: 'Engineering',
            avatar: 'https://example.com/avatar.jpg',
        };
        it('should successfully login with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery
                .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 });
            mockedBcrypt.compare.mockResolvedValue(true);
            mockedJwt.sign.mockReturnValue('mock-token');
            const result = yield authService.login({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(result.token).toBe('mock-token');
            expect(result.user.email).toBe('test@example.com');
            expect(result.user.name).toBe('Test User');
            expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
        }));
        it('should throw error for non-existent user', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            yield expect(authService.login({
                email: 'nonexistent@example.com',
                password: 'password123',
            })).rejects.toThrow('Invalid credentials');
        }));
        it('should throw error for invalid password', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockedBcrypt.compare.mockResolvedValue(false);
            yield expect(authService.login({
                email: 'test@example.com',
                password: 'wrongpassword',
            })).rejects.toThrow('Invalid credentials');
        }));
        it('should generate avatar URL if employee has no avatar', () => __awaiter(void 0, void 0, void 0, function* () {
            const employeeWithoutAvatar = Object.assign(Object.assign({}, mockEmployee), { avatar: null });
            mockedQuery
                .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [employeeWithoutAvatar], rowCount: 1 });
            mockedBcrypt.compare.mockResolvedValue(true);
            mockedJwt.sign.mockReturnValue('mock-token');
            const result = yield authService.login({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(result.user.avatar).toContain('ui-avatars.com');
        }));
    });
    describe('changePassword', () => {
        const mockUser = {
            id: 'user-123',
            email: 'test@example.com',
            password_hash: 'old-hashed-password',
        };
        it('should successfully change password with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery
                .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 })
                .mockResolvedValueOnce({ rows: [], rowCount: 1 });
            mockedBcrypt.compare
                .mockResolvedValueOnce(true) // current password valid
                .mockResolvedValueOnce(false); // new password is different
            mockedBcrypt.hash.mockResolvedValue('new-hashed-password');
            yield expect(authService.changePassword('user-123', {
                currentPassword: 'oldPassword123!',
                newPassword: 'NewPassword123!',
            })).resolves.not.toThrow();
            expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
        }));
        it('should throw error for non-existent user', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
            yield expect(authService.changePassword('nonexistent-user', {
                currentPassword: 'oldPassword123!',
                newPassword: 'NewPassword123!',
            })).rejects.toThrow('User not found');
        }));
        it('should throw error for incorrect current password', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockedBcrypt.compare.mockResolvedValue(false);
            yield expect(authService.changePassword('user-123', {
                currentPassword: 'wrongPassword',
                newPassword: 'NewPassword123!',
            })).rejects.toThrow('Current password is incorrect');
        }));
        it('should throw error when new password is same as current', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            mockedBcrypt.compare
                .mockResolvedValueOnce(true) // current password valid
                .mockResolvedValueOnce(true); // new password same as old
            yield expect(authService.changePassword('user-123', {
                currentPassword: 'SamePassword123!',
                newPassword: 'SamePassword123!',
            })).rejects.toThrow('New password must be different from current password');
        }));
        it('should throw error for weak password (too short)', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            yield expect(authService.changePassword('user-123', {
                currentPassword: 'oldPassword123!',
                newPassword: 'short',
            })).rejects.toThrow('Password must be at least 8 characters long');
        }));
        it('should throw error for password without complexity requirements', () => __awaiter(void 0, void 0, void 0, function* () {
            mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 });
            yield expect(authService.changePassword('user-123', {
                currentPassword: 'oldPassword123!',
                newPassword: 'simplepassword',
            })).rejects.toThrow('Password must contain at least one uppercase letter');
        }));
    });
    describe('verifyToken', () => {
        it('should successfully verify valid token', () => {
            const mockPayload = { userId: 'user-123', email: 'test@example.com' };
            mockedJwt.verify.mockReturnValue(mockPayload);
            const result = authService.verifyToken('valid-token');
            expect(result).toEqual(mockPayload);
        });
        it('should throw error for invalid token', () => {
            mockedJwt.verify.mockImplementation(() => {
                throw new Error('jwt malformed');
            });
            expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
        });
    });
});
