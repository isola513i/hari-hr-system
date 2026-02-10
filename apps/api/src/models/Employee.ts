export type { Employee } from '@hari/shared-types';

export interface CreateEmployeeDTO {
    name: string;
    email: string;
    role: string;
    department: string;
    joinDate: string;
    salary?: number;
    password?: string;
}

export interface UpdateEmployeeDTO extends Partial<CreateEmployeeDTO> {
    id: string;
    bio?: string;
    phone?: string;
    avatar?: string;
    location?: string;
    slack?: string;
    emergencyContact?: string;
    skills?: string[];
    managerId?: string | null;
}
