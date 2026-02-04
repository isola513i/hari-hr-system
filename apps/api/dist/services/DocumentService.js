"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const db_1 = require("../db");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DocumentService {
    // Get active documents only (not deleted)
    getAllDocuments() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)("SELECT * FROM documents WHERE status = 'Active' OR status IS NULL ORDER BY uploaded_at DESC");
            return result.rows.map(this.mapRowToDocument);
        });
    }
    // Get deleted documents (Trash)
    getDeletedDocuments() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)("SELECT * FROM documents WHERE status = 'Deleted' ORDER BY deleted_at DESC");
            return result.rows.map(this.mapRowToDocument);
        });
    }
    getDocumentById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)('SELECT * FROM documents WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return null;
            }
            return this.mapRowToDocument(result.rows[0]);
        });
    }
    createDocument(documentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const { name, type, size, category, ownerName, employeeId, filePath } = documentData;
            const sizeStr = this.formatFileSize(size);
            const result = yield (0, db_1.query)(`INSERT INTO documents (name, type, size, category, owner_name, employee_id, file_path, last_accessed)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
             RETURNING *`, [name, type, sizeStr, category, ownerName, employeeId || null, filePath]);
            return this.mapRowToDocument(result.rows[0]);
        });
    }
    // Soft delete - move to trash
    deleteDocument(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield this.getDocumentById(id);
            if (!document) {
                throw new Error('Document not found');
            }
            yield (0, db_1.query)("UPDATE documents SET status = 'Deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = $1", [id]);
        });
    }
    // Restore from trash
    restoreDocument(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield (0, db_1.query)("UPDATE documents SET status = 'Active', deleted_at = NULL WHERE id = $1 RETURNING *", [id]);
            if (result.rows.length === 0) {
                throw new Error('Document not found');
            }
            return this.mapRowToDocument(result.rows[0]);
        });
    }
    // Permanent delete - actually remove file and record
    permanentDeleteDocument(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield this.getDocumentById(id);
            if (!document) {
                throw new Error('Document not found');
            }
            // Delete file from disk
            if (document.filePath && fs_1.default.existsSync(document.filePath)) {
                fs_1.default.unlinkSync(document.filePath);
            }
            // Delete from database
            yield (0, db_1.query)('DELETE FROM documents WHERE id = $1', [id]);
        });
    }
    getDocumentFilePath(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const document = yield this.getDocumentById(id);
            if (!document) {
                throw new Error('Document not found');
            }
            if (!document.filePath || !fs_1.default.existsSync(document.filePath)) {
                throw new Error('File not found on disk');
            }
            // Update last accessed time
            yield (0, db_1.query)('UPDATE documents SET last_accessed = $1 WHERE id = $2', [new Date().toISOString(), id]);
            return document.filePath;
        });
    }
    // Get storage statistics
    getStorageStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const uploadDir = path_1.default.join(__dirname, '../../uploads');
            // Default storage limit (can be configured via env var)
            const totalStorage = parseInt(process.env.STORAGE_LIMIT_GB || '100', 10) * 1024 * 1024 * 1024; // 100 GB default
            let usedStorage = 0;
            // Calculate actual storage used
            if (fs_1.default.existsSync(uploadDir)) {
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
        });
    }
    // Recursively calculate directory size
    getDirectorySize(dirPath) {
        let totalSize = 0;
        if (!fs_1.default.existsSync(dirPath)) {
            return 0;
        }
        const files = fs_1.default.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path_1.default.join(dirPath, file);
            const stats = fs_1.default.statSync(filePath);
            if (stats.isDirectory()) {
                totalSize += this.getDirectorySize(filePath);
            }
            else {
                totalSize += stats.size;
            }
        }
        return totalSize;
    }
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
    mapRowToDocument(row) {
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
exports.DocumentService = DocumentService;
exports.default = new DocumentService();
