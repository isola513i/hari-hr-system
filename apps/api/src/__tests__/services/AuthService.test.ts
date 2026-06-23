import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as otplib from 'otplib';
import QRCode from 'qrcode';
import { AuthService } from '../../services/AuthService';
import { AuthResponse } from '../../models/User';
import { query } from '../../db';
import { encrypt, decrypt } from '../../utils/encryption';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

// Mock the TOTP / crypto collaborators so the 2FA flows are deterministic.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCK_SECRET'),
  generateSync: jest.fn(() => '123456'),
  verifySync: jest.fn(() => ({ valid: true })),
  generateURI: jest.fn(() => 'otpauth://totp/HARI%20HR:test@example.com?secret=MOCK_SECRET'),
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(async () => 'data:image/png;base64,MOCKQR'),
}));
jest.mock('../../utils/encryption', () => ({
  encrypt: jest.fn((v: string) => `enc:${v}`),
  decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')),
}));

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedVerifySync = otplib.verifySync as jest.Mock;
const mockedToDataURL = QRCode.toDataURL as jest.Mock;
const mockedEncrypt = encrypt as jest.Mock;
const mockedDecrypt = decrypt as jest.Mock;

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
      }) as AuthResponse;

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
      }) as AuthResponse;

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

  // ── Two-factor authentication (TOTP) ──────────────────────────────────────

  describe('login with 2FA enabled', () => {
    it('returns a totp_required challenge instead of issuing tokens', async () => {
      mockedQuery.mockReset();
      const userWith2fa = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        role: 'EMPLOYEE',
        totp_enabled: true,
      };
      mockedQuery.mockResolvedValueOnce({ rows: [userWith2fa], rowCount: 1 } as never);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      (mockedJwt.sign as jest.Mock).mockReturnValue('pending-token');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // A 2FA account must NOT receive an access/refresh token at login.
      expect(result).toEqual({ totp_required: true, pending_token: 'pending-token' });
      expect('token' in result).toBe(false);
      // Only the user lookup ran — no refresh_tokens INSERT.
      expect(mockedQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('setupTotp', () => {
    it('generates a secret and QR code for the user', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }], rowCount: 1 } as never);

      const result = await authService.setupTotp('user-123');

      expect(result.secret).toBe('MOCK_SECRET');
      expect(result.manualKey).toBe('MOCK_SECRET');
      expect(result.qrCodeDataUrl).toContain('data:image');
      expect(mockedToDataURL).toHaveBeenCalled();
    });

    it('throws when the user does not exist', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(authService.setupTotp('missing')).rejects.toThrow('User not found');
    });
  });

  describe('enableTotp', () => {
    it('enables 2FA and returns 8 backup codes on a valid code', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never); // UPDATE + 8 INSERTs
      mockedVerifySync.mockReturnValue({ valid: true });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      const codes = await authService.enableTotp('user-123', 'MOCK_SECRET', '123456');

      expect(codes).toHaveLength(8);
      expect(mockedEncrypt).toHaveBeenCalledWith('MOCK_SECRET');
      // 1 UPDATE users + 8 INSERT backup codes
      expect(mockedQuery).toHaveBeenCalledTimes(9);
    });

    it('rejects an invalid verification code', async () => {
      mockedVerifySync.mockReturnValue({ valid: false });
      await expect(
        authService.enableTotp('user-123', 'MOCK_SECRET', '000000'),
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('verifyTotpLogin', () => {
    const user2fa = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'EMPLOYEE',
      totp_enabled: true,
      totp_secret: 'enc:MOCK_SECRET',
    };

    it('completes login with a valid TOTP code', async () => {
      mockedQuery.mockReset();
      (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', totp_pending: true });
      mockedQuery
        .mockResolvedValueOnce({ rows: [user2fa], rowCount: 1 } as never)                                  // SELECT users
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', name: 'Test', department: 'Eng' }], rowCount: 1 } as never) // SELECT employees
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);                                        // INSERT refresh_tokens
      mockedDecrypt.mockReturnValue('MOCK_SECRET');
      mockedVerifySync.mockReturnValue({ valid: true });
      (mockedJwt.sign as jest.Mock).mockReturnValue('access-token');

      const result = await authService.verifyTotpLogin('pending-token', '123456');

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockedVerifySync).toHaveBeenCalled();
    });

    it('completes login with a valid backup code when the TOTP code fails', async () => {
      mockedQuery.mockReset();
      (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', totp_pending: true });
      mockedQuery
        .mockResolvedValueOnce({ rows: [user2fa], rowCount: 1 } as never)                                  // SELECT users
        .mockResolvedValueOnce({ rows: [{ id: 'bc-1', code_hash: 'hash1' }], rowCount: 1 } as never)       // SELECT backup codes
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)                                         // UPDATE used_at
        .mockResolvedValueOnce({ rows: [{ id: 'emp-1', name: 'Test' }], rowCount: 1 } as never)            // SELECT employees
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);                                        // INSERT refresh_tokens
      mockedDecrypt.mockReturnValue('MOCK_SECRET');
      mockedVerifySync.mockReturnValue({ valid: false });
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true); // backup code matches
      (mockedJwt.sign as jest.Mock).mockReturnValue('access-token');

      const result = await authService.verifyTotpLogin('pending-token', 'ABCDE-FGHIJ');

      expect(result.accessToken).toBe('access-token');
    });

    it('rejects an expired or invalid pending token', async () => {
      (mockedJwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });
      await expect(
        authService.verifyTotpLogin('bad-token', '123456'),
      ).rejects.toThrow('Pending session expired');
    });

    it('rejects when 2FA is not enabled for the account', async () => {
      mockedQuery.mockReset();
      (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', totp_pending: true });
      mockedQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-123', totp_enabled: false, totp_secret: null }],
        rowCount: 1,
      } as never);
      await expect(
        authService.verifyTotpLogin('pending-token', '123456'),
      ).rejects.toThrow('not enabled');
    });

    it('rejects when neither the TOTP code nor a backup code matches', async () => {
      mockedQuery.mockReset();
      (mockedJwt.verify as jest.Mock).mockReturnValue({ userId: 'user-123', totp_pending: true });
      mockedQuery
        .mockResolvedValueOnce({ rows: [user2fa], rowCount: 1 } as never) // SELECT users
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);       // SELECT backup codes (none)
      mockedDecrypt.mockReturnValue('MOCK_SECRET');
      mockedVerifySync.mockReturnValue({ valid: false });

      await expect(
        authService.verifyTotpLogin('pending-token', '123456'),
      ).rejects.toThrow('Invalid verification code');
    });
  });

  describe('disableTotp', () => {
    it('disables 2FA when the password is correct', async () => {
      mockedQuery.mockReset();
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ password_hash: 'hash' }], rowCount: 1 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)                          // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);                         // DELETE codes
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.disableTotp('user-123', 'password')).resolves.not.toThrow();
      expect(mockedQuery).toHaveBeenCalledTimes(3);
    });

    it('rejects an incorrect password', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({ rows: [{ password_hash: 'hash' }], rowCount: 1 } as never);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.disableTotp('user-123', 'wrong')).rejects.toThrow('Incorrect password');
    });
  });

  describe('adminDisableTotp', () => {
    it('resets 2FA for a target user without their password', async () => {
      mockedQuery.mockReset();
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ id: 'user-9' }], rowCount: 1 } as never) // SELECT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)                 // UPDATE
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);                // DELETE codes
      await expect(authService.adminDisableTotp('user-9')).resolves.not.toThrow();
      expect(mockedQuery).toHaveBeenCalledTimes(3);
    });

    it('throws when the target user does not exist', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(authService.adminDisableTotp('ghost')).rejects.toThrow('User not found');
    });
  });

  describe('getTotpStatus', () => {
    it('returns enabled state and remaining backup-code count', async () => {
      mockedQuery.mockReset();
      mockedQuery
        .mockResolvedValueOnce({ rows: [{ totp_enabled: true }], rowCount: 1 } as never) // SELECT totp_enabled
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 } as never);        // COUNT codes

      const status = await authService.getTotpStatus('user-123');

      expect(status).toEqual({ enabled: true, backupCodesRemaining: 5 });
    });

    it('throws when the user does not exist', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
      await expect(authService.getTotpStatus('missing')).rejects.toThrow('User not found');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('replaces the codes when the TOTP code is valid', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({
        rows: [{ totp_enabled: true, totp_secret: 'enc:MOCK_SECRET' }],
        rowCount: 1,
      } as never);
      mockedQuery.mockResolvedValue({ rows: [], rowCount: 1 } as never); // DELETE + 8 INSERTs
      mockedDecrypt.mockReturnValue('MOCK_SECRET');
      mockedVerifySync.mockReturnValue({ valid: true });
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-code');

      const codes = await authService.regenerateBackupCodes('user-123', '123456');

      expect(codes).toHaveLength(8);
    });

    it('throws when 2FA is not enabled', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({
        rows: [{ totp_enabled: false, totp_secret: null }],
        rowCount: 1,
      } as never);
      await expect(
        authService.regenerateBackupCodes('user-123', '123456'),
      ).rejects.toThrow('not enabled');
    });

    it('throws on an invalid TOTP code', async () => {
      mockedQuery.mockReset();
      mockedQuery.mockResolvedValueOnce({
        rows: [{ totp_enabled: true, totp_secret: 'enc:MOCK_SECRET' }],
        rowCount: 1,
      } as never);
      mockedDecrypt.mockReturnValue('MOCK_SECRET');
      mockedVerifySync.mockReturnValue({ valid: false });
      await expect(
        authService.regenerateBackupCodes('user-123', '000000'),
      ).rejects.toThrow('Invalid verification code');
    });
  });
});
