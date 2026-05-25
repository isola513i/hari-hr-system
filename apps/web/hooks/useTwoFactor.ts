import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { TotpSetupResponse, TotpStatusResponse } from '../types';

interface UseTwoFactorReturn {
  // Status
  status: TotpStatusResponse | null;
  statusLoading: boolean;
  fetchStatus: () => Promise<void>;

  // Setup (QR code)
  setup: TotpSetupResponse | null;
  setupLoading: boolean;
  fetchSetup: () => Promise<void>;

  // Enable 2FA
  enableLoading: boolean;
  backupCodes: string[];
  enableTotp: (secret: string, token: string) => Promise<boolean>;

  // Disable 2FA
  disableLoading: boolean;
  disableTotp: (password: string) => Promise<boolean>;

  // Backup codes
  backupCodesLoading: boolean;
  regeneratedCodes: string[];
  regenerateBackupCodes: (token: string) => Promise<boolean>;

  // Admin reset
  adminResetLoading: boolean;
  adminResetTotp: (userId: string) => Promise<boolean>;

  // Error / success
  error: string;
  clearError: () => void;
}

export function useTwoFactor(): UseTwoFactorReturn {
  const [status, setStatus] = useState<TotpStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const [enableLoading, setEnableLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const [disableLoading, setDisableLoading] = useState(false);

  const [backupCodesLoading, setBackupCodesLoading] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);

  const [adminResetLoading, setAdminResetLoading] = useState(false);

  const [error, setError] = useState('');
  const clearError = useCallback(() => setError(''), []);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const data = await api.auth.getTotpStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch 2FA status');
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchSetup = useCallback(async () => {
    setSetupLoading(true);
    try {
      const data = await api.auth.setupTotp();
      setSetup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setSetupLoading(false);
    }
  }, []);

  const enableTotp = useCallback(async (secret: string, token: string): Promise<boolean> => {
    setEnableLoading(true);
    try {
      const data = await api.auth.enableTotp(secret, token);
      setBackupCodes(data.backupCodes);
      setStatus(prev => prev ? { ...prev, enabled: true, backupCodesRemaining: 8 } : null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to enable 2FA');
      return false;
    } finally {
      setEnableLoading(false);
    }
  }, []);

  const disableTotp = useCallback(async (password: string): Promise<boolean> => {
    setDisableLoading(true);
    try {
      await api.auth.disableTotp(password);
      setStatus(prev => prev ? { ...prev, enabled: false, backupCodesRemaining: 0 } : null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
      return false;
    } finally {
      setDisableLoading(false);
    }
  }, []);

  const regenerateBackupCodes = useCallback(async (token: string): Promise<boolean> => {
    setBackupCodesLoading(true);
    try {
      const data = await api.auth.regenerateBackupCodes(token);
      setRegeneratedCodes(data.backupCodes);
      setStatus(prev => prev ? { ...prev, backupCodesRemaining: 8 } : null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes');
      return false;
    } finally {
      setBackupCodesLoading(false);
    }
  }, []);

  const adminResetTotp = useCallback(async (userId: string): Promise<boolean> => {
    setAdminResetLoading(true);
    try {
      await api.auth.adminResetTotp(userId);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to reset 2FA');
      return false;
    } finally {
      setAdminResetLoading(false);
    }
  }, []);

  return {
    status, statusLoading, fetchStatus,
    setup, setupLoading, fetchSetup,
    enableLoading, backupCodes, enableTotp,
    disableLoading, disableTotp,
    backupCodesLoading, regeneratedCodes, regenerateBackupCodes,
    adminResetLoading, adminResetTotp,
    error, clearError,
  };
}

export default useTwoFactor;
