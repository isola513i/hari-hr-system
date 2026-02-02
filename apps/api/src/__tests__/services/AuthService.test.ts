import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../services/AuthService';
import { query } from '../../db';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
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

    it('should successfully login with valid credentials', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [mockEmployee], rowCount: 1 } as never);

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('mock-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.name).toBe('Test User');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
    });

    it('should throw error for non-existent user', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should generate avatar URL if employee has no avatar', async () => {
      const employeeWithoutAvatar = { ...mockEmployee, avatar: null };
      mockedQuery
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [employeeWithoutAvatar], rowCount: 1 } as never);

      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('mock-token');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.avatar).toContain('ui-avatars.com');
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password_hash: 'old-hashed-password',
    };

    it('should successfully change password with valid data', async () => {
      mockedQuery
        .mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      (mockedBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // current password valid
        .mockResolvedValueOnce(false); // new password is different
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'oldPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).resolves.not.toThrow();

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 10);
    });

    it('should throw error for non-existent user', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

      await expect(
        authService.changePassword('nonexistent-user', {
          currentPassword: 'oldPassword123!',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'wrongPassword',
          newPassword: 'NewPassword123!',
        })
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when new password is same as current', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never);
      (mockedBcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true)  // current password valid
        .mockResolvedValueOnce(true); // new password same as old

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        })
      ).rejects.toThrow('New password must be different from current password');
    });

    it('should throw error for weak password (too short)', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never);

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'oldPassword123!',
          newPassword: 'short',
        })
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should throw error for password without complexity requirements', async () => {
      mockedQuery.mockResolvedValueOnce({ rows: [mockUser], rowCount: 1 } as never);

      await expect(
        authService.changePassword('user-123', {
          currentPassword: 'oldPassword123!',
          newPassword: 'simplepassword',
        })
      ).rejects.toThrow('Password must contain at least one uppercase letter');
    });
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', () => {
      const mockPayload = { userId: 'user-123', email: 'test@example.com' };
      (mockedJwt.verify as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
    });

    it('should throw error for invalid token', () => {
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => authService.verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });
});
