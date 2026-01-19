import React, { useState, useMemo } from 'react';
import { X, Lock, Check, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
    bgColor: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Calculate password strength
    const passwordStrength = useMemo((): PasswordStrength => {
        if (!newPassword) {
            return { score: 0, label: '', color: '', bgColor: '' };
        }

        let score = 0;

        // Length check
        if (newPassword.length >= 8) score += 1;
        if (newPassword.length >= 12) score += 1;

        // Character variety checks
        if (/[a-z]/.test(newPassword)) score += 1;
        if (/[A-Z]/.test(newPassword)) score += 1;
        if (/[0-9]/.test(newPassword)) score += 1;
        if (/[^a-zA-Z0-9]/.test(newPassword)) score += 1;

        // Map score to strength
        if (score <= 2) {
            return { score: score * 16.67, label: 'Weak', color: 'text-red-600', bgColor: 'bg-red-500' };
        } else if (score <= 4) {
            return { score: score * 16.67, label: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-500' };
        } else if (score === 5) {
            return { score: score * 16.67, label: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-500' };
        } else {
            return { score: 100, label: 'Strong', color: 'text-green-600', bgColor: 'bg-green-500' };
        }
    }, [newPassword]);

    // Password requirements
    const requirements = useMemo(() => [
        { label: 'At least 8 characters', met: newPassword.length >= 8 },
        { label: 'Contains uppercase letter', met: /[A-Z]/.test(newPassword) },
        { label: 'Contains lowercase letter', met: /[a-z]/.test(newPassword) },
        { label: 'Contains number', met: /[0-9]/.test(newPassword) },
        { label: 'Contains special character', met: /[^a-zA-Z0-9]/.test(newPassword) },
    ], [newPassword]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        // Check if password is too weak
        if (passwordStrength.score < 50) {
            setError('Password is too weak. Please choose a stronger password.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/change-password', { currentPassword, newPassword });
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-border-light dark:border-border-dark">
                <div className="px-6 py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg text-text-light dark:text-text-dark">Change Password</h3>
                    <button onClick={onClose} className="text-text-muted-light hover:text-text-light">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 flex items-center gap-2 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900">
                            <Check size={16} /> Password updated successfully!
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Current Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>

                        {/* Password Strength Meter */}
                        {newPassword && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-text-muted-light dark:text-text-muted-dark">Password Strength</span>
                                    <span className={`font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${passwordStrength.bgColor} transition-all duration-300 rounded-full`}
                                        style={{ width: `${passwordStrength.score}%` }}
                                    ></div>
                                </div>

                                {/* Requirements Checklist */}
                                <div className="mt-3 space-y-1.5">
                                    {requirements.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                            {req.met ? (
                                                <Check size={14} className="text-green-600 dark:text-green-400" />
                                            ) : (
                                                <AlertCircle size={14} className="text-gray-400" />
                                            )}
                                            <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-text-muted-light dark:text-text-muted-dark'}>
                                                {req.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Confirm New Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={16} />
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-text-muted-light hover:text-text-light"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
