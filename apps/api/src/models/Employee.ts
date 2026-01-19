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
    phoneNumber?: string;
    address?: string;
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
}
