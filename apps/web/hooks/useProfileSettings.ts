import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { api, API_HOST, BASE_URL, getAuthToken } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { parsePhoneNumber } from '../lib/phoneUtils';
import { getErrorMessage } from '../lib/errorHandler';
import type { User } from '../types';

export function useProfileSettings() {
  const { t } = useTranslation('settings');
  const { user, updateUser } = useAuth();
  const qc = useQueryClient();
  const { showToast } = useToast();

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [countryCode, setCountryCode] = useState('+66'); // Default to Thailand
  const [avatarPreview, setAvatarPreview] = useState('https://picsum.photos/id/338/200/200');
  const [avatarRawPath, setAvatarRawPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      const names = (user.name || '').split(' ');

      // Parse phone number to extract country code if it exists
      let phoneNumber = '';
      let extractedCountryCode = '+66'; // Default

      // Parse phone number to extract country code
      const parsed = parsePhoneNumber(user.phone || '');
      extractedCountryCode = parsed.code;
      phoneNumber = parsed.number;

      setProfile({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        phone: phoneNumber, // Just the number without country code
        bio: user.bio || '', // Load bio from user if exists
      });
      setCountryCode(extractedCountryCode);

      if (user.avatar) {
        // Prepend API URL if avatar is a relative path
        const fullAvatarUrl = user.avatar.startsWith('/')
          ? `${API_HOST}${user.avatar}`
          : user.avatar;
        setAvatarPreview(fullAvatarUrl);
      }
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('general.avatarTooLarge'), 'error');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast(t('general.avatarInvalidType'), 'error');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      // Upload the file to the server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${BASE_URL}/employees/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();

      // Store the raw relative path for DB save, but display with full URL
      setAvatarRawPath(data.avatarUrl);
      const fullAvatarUrl = data.avatarUrl.startsWith('/')
        ? `${API_HOST}${data.avatarUrl}`
        : data.avatarUrl;
      setAvatarPreview(fullAvatarUrl);

      showToast(t('general.avatarUploaded'), 'success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast(t('general.avatarFailed'), 'error');
      // Revert to original avatar on error
      setAvatarPreview(user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.employeeId) {
      showToast(t('general.noUser'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();

      // Combine country code and phone number
      const fullPhoneNumber = profile.phone ? `${countryCode}${profile.phone}` : '';

      // Only include avatar if user uploaded a new one this session
      const patchPayload: Record<string, unknown> = {
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
      };

      if (avatarRawPath) {
        patchPayload.avatar = avatarRawPath; // relative path from upload
      }

      await api.patch(`/employees/${user.employeeId}`, patchPayload);

      // Update AuthContext (only include avatar if changed)
      const contextUpdate: Partial<User> = {
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
      };
      if (avatarRawPath) {
        contextUpdate.avatar = avatarRawPath;
      }
      updateUser(contextUpdate);

      showToast(t('general.profileSaved'), 'success');

      // Invalidate React Query caches so employee lists stay in sync
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
    } catch (error) {
      let errorMessage = t('general.saveFailed');
      const msg = getErrorMessage(error, '');
      if (msg) {
        errorMessage = msg;
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    profile,
    setProfile,
    countryCode,
    setCountryCode,
    avatarPreview,
    avatarRawPath,
    isSaving,
    handleAvatarChange,
    handleSaveProfile,
  };
}
