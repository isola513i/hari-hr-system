import { query } from '../db';
import { Document, CreateDocumentDTO } from '../models/Document';
import path from 'path';
import fs from 'fs';

export class DocumentService {
    async getAllDocuments(): Promise<Document[]> {
        const result = await query('SELECT * FROM documents ORDER BY uploaded_at DESC');
        return result.rows.map(this.mapRowToDocument);
    }

    async getDocumentById(id: string): Promise<Document | null> {
        const result = await query('SELECT * FROM documents WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapRowToDocument(result.rows[0]);
    }

    async createDocument(documentData: CreateDocumentDTO): Promise<Document> {
        const { name, type, size, category, ownerName, employeeId, filePath } = documentData;

        const sizeStr = this.formatFileSize(size);
        const uploadedAt = new Date().toISOString();

        const result = await query(
            `INSERT INTO documents (name, type, size, category, owner, employee_id, file_path, uploaded_at, last_accessed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
             RETURNING *`,
            [name, type, sizeStr, category, ownerName, employeeId, filePath, uploadedAt]
        );

        return this.mapRowToDocument(result.rows[0]);
    }

    async deleteDocument(id: string): Promise<void> {
        // Get document to delete file
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }

        // Delete file from disk
        if (document.filePath && fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        // Delete from database
        await query('DELETE FROM documents WHERE id = $1', [id]);
    }

    async getDocumentFilePath(id: string): Promise<string> {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }

        if (!document.filePath || !fs.existsSync(document.filePath)) {
            throw new Error('File not found on disk');
        }

        // Update last accessed time
        await query(
            'UPDATE documents SET last_accessed = $1 WHERE id = $2',
            [new Date().toISOString(), id]
        );

        return document.filePath;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    private mapRowToDocument(row: any): Document {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            size: row.size,
            category: row.category,
            owner: row.owner,
            employeeId: row.employee_id,
            lastAccessed: row.last_accessed,
            uploadedAt: row.uploaded_at,
            filePath: row.file_path,
        };
    }
}

export default new DocumentService();
