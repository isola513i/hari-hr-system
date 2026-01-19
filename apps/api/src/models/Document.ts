export interface Document {
    id: string;
    name: string;
    type: string;
    size: string;
    category: string;
    owner: string;
    employeeId: string;
    lastAccessed: string;
    uploadedAt: string;
    filePath: string;
}

export interface CreateDocumentDTO {
    name: string;
    type: string;
    size: number;
    category: string;
    ownerName: string;
    employeeId: string;
    filePath: string;
}
