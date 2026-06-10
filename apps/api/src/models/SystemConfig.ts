export interface SystemConfig {
    id: string;
    category: string;
    key: string;
    value: string;
    dataType: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSystemConfigDTO {
    category: string;
    key: string;
    value: string;
    dataType: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
}

export interface UpdateSystemConfigDTO {
    value: string;
    description?: string;
    dataType?: string;
}

// Typed config getters for better type safety
export interface LeaveQuota {
    type: string;
    total: number;
    color?: string;
}

export interface SystemSettings {
    defaultPassword: string;
    leaveQuotas: LeaveQuota[];
    sessionTimeout: number;
    maxFileUploadSize: number;
}
