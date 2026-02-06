export interface Employee {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    joinDate: string;
    salary?: number;
    avatar?: string;
    status?: string;
    bio?: string;
    phone?: string;
    phoneNumber?: string;
    address?: string;
    location?: string;
    slack?: string;
    emergencyContact?: string;
    skills?: string[];
    managerId?: string;
    onboardingStatus?: string;
    onboardingPercentage?: number;
}

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
