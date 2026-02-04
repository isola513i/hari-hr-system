export interface Employee {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    startDate: string;
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
}

export interface CreateEmployeeDTO {
    name: string;
    email: string;
    role: string;
    department: string;
    startDate: string;
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
