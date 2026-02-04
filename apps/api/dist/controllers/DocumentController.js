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
exports.DocumentController = void 0;
const DocumentService_1 = __importDefault(require("../services/DocumentService"));
const path_1 = __importDefault(require("path"));
// Fix UTF-8 filename encoding from multipart form
const fixFilename = (filename) => {
    try {
        // Try to decode from latin1 to UTF-8 (common browser encoding issue)
        return Buffer.from(filename, 'latin1').toString('utf8');
    }
    catch (_a) {
        return filename;
    }
};
class DocumentController {
    getAllDocuments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const documents = yield DocumentService_1.default.getAllDocuments();
                res.json(documents);
            }
            catch (error) {
                console.error('Get documents error:', error);
                res.status(500).json({ error: 'Failed to fetch documents' });
            }
        });
    }
    createDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = req.file;
                if (!file) {
                    res.status(400).json({ error: 'No file uploaded' });
                    return;
                }
                const { category, ownerName, employeeId } = req.body;
                if (!category || !ownerName || !employeeId) {
                    res.status(400).json({ error: 'Missing required fields' });
                    return;
                }
                const originalName = fixFilename(file.originalname);
                const documentData = {
                    name: originalName,
                    type: path_1.default.extname(originalName).substring(1).toUpperCase(),
                    size: file.size,
                    category,
                    ownerName,
                    employeeId,
                    filePath: file.path,
                };
                const document = yield DocumentService_1.default.createDocument(documentData);
                res.status(201).json(document);
            }
            catch (error) {
                console.error('Create document error:', error);
                res.status(400).json({ error: error.message || 'Failed to upload document' });
            }
        });
    }
    downloadDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const filePath = yield DocumentService_1.default.getDocumentFilePath(id);
                res.download(filePath, (err) => {
                    if (err) {
                        console.error('Download error:', err);
                        res.status(500).json({ error: 'Failed to download file' });
                    }
                });
            }
            catch (error) {
                console.error('Download document error:', error);
                if (error.message === 'Document not found' || error.message === 'File not found on disk') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to download document' });
                }
            }
        });
    }
    deleteDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield DocumentService_1.default.deleteDocument(id);
                res.json({ message: 'Document moved to trash' });
            }
            catch (error) {
                console.error('Delete document error:', error);
                if (error.message === 'Document not found') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to delete document' });
                }
            }
        });
    }
    // Get deleted documents (Trash)
    getDeletedDocuments(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const documents = yield DocumentService_1.default.getDeletedDocuments();
                res.json(documents);
            }
            catch (error) {
                console.error('Get deleted documents error:', error);
                res.status(500).json({ error: 'Failed to fetch deleted documents' });
            }
        });
    }
    // Restore from trash
    restoreDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const document = yield DocumentService_1.default.restoreDocument(id);
                res.json({ message: 'Document restored successfully', document });
            }
            catch (error) {
                console.error('Restore document error:', error);
                if (error.message === 'Document not found') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to restore document' });
                }
            }
        });
    }
    // Permanent delete
    permanentDeleteDocument(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield DocumentService_1.default.permanentDeleteDocument(id);
                res.json({ message: 'Document permanently deleted' });
            }
            catch (error) {
                console.error('Permanent delete error:', error);
                if (error.message === 'Document not found') {
                    res.status(404).json({ error: error.message });
                }
                else {
                    res.status(500).json({ error: 'Failed to permanently delete document' });
                }
            }
        });
    }
    // Get storage statistics
    getStorageStats(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield DocumentService_1.default.getStorageStats();
                res.json(stats);
            }
            catch (error) {
                console.error('Get storage stats error:', error);
                res.status(500).json({ error: 'Failed to fetch storage statistics' });
            }
        });
    }
}
exports.DocumentController = DocumentController;
exports.default = new DocumentController();
