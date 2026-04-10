export interface Holiday {
    id: string;
    date: string;
    endDate: string | null;
    name: string;
    isRecurring: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateHolidayDTO {
    date: string;
    endDate?: string | null;
    name: string;
    isRecurring?: boolean;
}

export interface UpdateHolidayDTO {
    date?: string;
    endDate?: string | null;
    name?: string;
    isRecurring?: boolean;
}
