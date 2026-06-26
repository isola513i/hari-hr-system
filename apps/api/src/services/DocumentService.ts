import { query } from '../db';
import { Document, CreateDocumentDTO } from '../models/Document';
import { PaginationParams, PaginatedResult, createPaginatedResult, buildPaginationClause, buildSortClause } from '../utils/pagination';
import { storageService } from './StorageService';
import { toInt } from '../utils/coerce';
import logger from '../utils/logger';

export class DocumentService {
    // Get active documents only (not deleted)
    async getAllDocuments(): Promise<Document[]> {
        const result = await query(
            "SELECT id, name, type, size, category, owner_name, employee_id, last_accessed, uploaded_at, file_path, status, deleted_at FROM documents WHERE status = 'Active' OR status IS NULL ORDER BY uploaded_at DESC"
        );
        return result.rows.map(this.mapRowToDocument);
    }

    // Get documents with pagination
    async getDocumentsPaginated(
        paginationParams: PaginationParams,
        filters: { category?: string; type?: string; search?: string },
        sortField: string = 'uploaded_at',
        sortOrder: 'ASC' | 'DESC' = 'DESC'
    ): Promise<PaginatedResult<Document>> {
        // Build WHERE clause for filters (only active documents)
        const whereClauses: string[] = ["(status = 'Active' OR status IS NULL)"];
        const params: any[] = [];
        let paramCount = 0;

        if (filters.category) {
            paramCount++;
            whereClauses.push(`category = $${paramCount}`);
            params.push(filters.category);
        }

        if (filters.type) {
            paramCount++;
            whereClauses.push(`type = $${paramCount}`);
            params.push(filters.type);
        }

        if (filters.search) {
            paramCount++;
            whereClauses.push(`(name ILIKE $${paramCount} OR category ILIKE $${paramCount})`);
            params.push(`%${filters.search}%`);
        }

        const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

        // Field mapping for sorting
        const fieldMapping: Record<string, string> = {
            'created_at': 'uploaded_at',
            'uploaded_at': 'uploaded_at',
            'name': 'name',
            'type': 'type',
            'size': 'size',
            'category': 'category',
        };

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) as total FROM documents ${whereClause}`,
            params
        );
        const total = toInt(countResult.rows[0].total);

        // Get paginated data
        const sortClause = buildSortClause(sortField, sortOrder, fieldMapping);
        const paginationClause = buildPaginationClause(paginationParams);

        const result = await query(
            `SELECT id, name, type, size, category, owner_name, employee_id, last_accessed, uploaded_at, file_path, status, deleted_at FROM documents ${whereClause} ${sortClause} ${paginationClause}`,
            params
        );

        const data = result.rows.map(this.mapRowToDocument);

        return createPaginatedResult(data, total, paginationParams);
    }

    // Get deleted documents (Trash)
    async getDeletedDocuments(): Promise<Document[]> {
        const result = await query(
            "SELECT id, name, type, size, category, owner_name, employee_id, last_accessed, uploaded_at, file_path, status, deleted_at FROM documents WHERE status = 'Deleted' ORDER BY deleted_at DESC"
        );
        return result.rows.map(this.mapRowToDocument);
    }

    async getDocumentById(id: string): Promise<Document | null> {
        const result = await query('SELECT id, name, type, size, category, owner_name, employee_id, last_accessed, uploaded_at, file_path, status, deleted_at FROM documents WHERE id = $1', [id]);
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

        // Delete file from storage
        if (document.filePath) {
            try {
                await storageService.delete(document.filePath);
            } catch (err) {
                logger.warn(err, 'Failed to delete file from storage:');
            }
        }

        // Delete from database
        await query('DELETE FROM documents WHERE id = $1', [id]);
    }

    async getDocumentFilePath(id: string): Promise<string> {
        const document = await this.getDocumentById(id);
        if (!document) {
            throw new Error('Document not found');
        }

        if (!document.filePath) {
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
        // Default storage limit (can be configured via env var)
        const totalStorage = parseInt(process.env.STORAGE_LIMIT_GB || '10', 10) * 1024 * 1024 * 1024; // 10 GB default (R2 free tier)

        const usedStorage = await storageService.getStorageUsed();

        const percentage = Math.round((usedStorage / totalStorage) * 100);

        return {
            used: usedStorage,
            total: totalStorage,
            usedFormatted: this.formatFileSize(usedStorage),
            totalFormatted: this.formatFileSize(totalStorage),
            percentage
        };
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
