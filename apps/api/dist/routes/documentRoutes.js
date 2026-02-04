"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DocumentController_1 = __importDefault(require("../controllers/DocumentController"));
const security_1 = require("../middlewares/security");
const auth_1 = require("../middlewares/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(null, true); // Allow all for demo, log warning
            console.warn('File type may not be supported:', file.mimetype);
        }
    },
});
// All routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/documents - Get all documents
router.get('/', DocumentController_1.default.getAllDocuments.bind(DocumentController_1.default));
// POST /api/documents - Upload document
router.post('/', security_1.apiLimiter, upload.single('file'), DocumentController_1.default.createDocument.bind(DocumentController_1.default));
// GET /api/documents/trash - Get deleted documents (must be before :id route)
router.get('/trash', DocumentController_1.default.getDeletedDocuments.bind(DocumentController_1.default));
// GET /api/documents/storage - Get storage statistics
router.get('/storage', DocumentController_1.default.getStorageStats.bind(DocumentController_1.default));
// GET /api/documents/:id/download - Download document
router.get('/:id/download', DocumentController_1.default.downloadDocument.bind(DocumentController_1.default));
// POST /api/documents/:id/restore - Restore from trash
router.post('/:id/restore', security_1.apiLimiter, DocumentController_1.default.restoreDocument.bind(DocumentController_1.default));
// DELETE /api/documents/:id - Soft delete (move to trash)
router.delete('/:id', security_1.apiLimiter, DocumentController_1.default.deleteDocument.bind(DocumentController_1.default));
// DELETE /api/documents/:id/permanent - Permanent delete
router.delete('/:id/permanent', security_1.apiLimiter, DocumentController_1.default.permanentDeleteDocument.bind(DocumentController_1.default));
exports.default = router;
