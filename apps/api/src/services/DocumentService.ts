import { query } from '../db';
import { Document, CreateDocumentDTO } from '../models/Document';
import path from 'path';
import fs from 'fs';

export class DocumentService {
    // Get active documents only (not deleted)
    async getAllDocuments(): Promise<Document[]> {
        const result = await query(
            "SELECT * FROM documents WHERE status = 'Active' OR status IS NULL ORDER BY uploaded_at DESC"
        );
        return result.rows.map(this.mapRowToDocument);
    }

    // Get deleted documents (Trash)
    async getDeletedDocuments(): Promise<Document[]> {
        const result = await query(
            "SELECT * FROM documents WHERE status = 'Deleted' ORDER BY deleted_at DESC"
        );
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

        const result = await query(
            `INSERT INTO documents (name, type, size, category, owner_name, employee_id, file_path, last_accessed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
             RETURNING *`,
            [name, type, sizeStr, category, ownerName, employeeId || null, filePath]
        );

        return this.mapRowToDocument(result.rows[0]);
    }

    // Soft delete - move to trash
    async deleteDocument(id: string): Promise<void> {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }

        await query(
            "UPDATE documents SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );
    }

    // Restore from trash
    async restoreDocument(id: string): Promise<Document> {
        const result = await query(
            "UPDATE documents SET status = 'Active', deleted_at = NULL WHERE id = $1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            throw new Error('Document not found');
        }

        return this.mapRowToDocument(result.rows[0]);
    }

    // Permanent delete - actually remove file and record
    async permanentDeleteDocument(id: string): Promise<void> {
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

    // Get storage statistics
    async getStorageStats(): Promise<{ used: number; total: number; usedFormatted: string; totalFormatted: string; percentage: number }> {
        const uploadDir = path.join(__dirname, '../../uploads');

        // Default storage limit (can be configured via env var)
        const totalStorage = parseInt(process.env.STORAGE_LIMIT_GB || '100', 10) * 1024 * 1024 * 1024; // 100 GB default

        let usedStorage = 0;

        // Calculate actual storage used
        if (fs.existsSync(uploadDir)) {
            usedStorage = this.getDirectorySize(uploadDir);
        }

        const percentage = Math.round((usedStorage / totalStorage) * 100);

        return {
            used: usedStorage,
            total: totalStorage,
            usedFormatted: this.formatFileSize(usedStorage),
            totalFormatted: this.formatFileSize(totalStorage),
            percentage
        };
    }

    // Recursively calculate directory size
    private getDirectorySize(dirPath: string): number {
        let totalSize = 0;

        if (!fs.existsSync(dirPath)) {
            return 0;
        }

        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                totalSize += this.getDirectorySize(filePath);
            } else {
                totalSize += stats.size;
            }
        }

        return totalSize;
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
            owner: row.owner_name,
            employeeId: row.employee_id,
            lastAccessed: row.last_accessed,
            uploadedAt: row.uploaded_at,
            filePath: row.file_path,
            status: row.status || 'Active',
            deletedAt: row.deleted_at,
        };
    }
}

export default new DocumentService();
