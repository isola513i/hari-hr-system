export interface EmployeeAddress {
    addressLine1?: string;
    subDistrict?: string;
    district?: string;
    province?: string;
    postalCode?: string;
}

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
    employeeCode?: string;
    address?: EmployeeAddress | null;
    location?: string;
    slack?: string;
    emergencyContact?: string;
    skills?: string[];
    managerId?: string;
    onboardingStatus?: string;
    onboardingPercentage?: number;
    bannerColor?: string | null;
    workType?: 'office' | 'remote' | 'hybrid';
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
    status?: string;
    location?: string;
    slack?: string;
    emergencyContact?: string;
    skills?: string[];
    managerId?: string | null;
    employeeCode?: string;
    address?: EmployeeAddress | null;
    bannerColor?: string | null;
    workType?: 'office' | 'remote' | 'hybrid';
}
