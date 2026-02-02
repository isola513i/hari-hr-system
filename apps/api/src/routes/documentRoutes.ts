import { Router } from 'express';
import DocumentController from '../controllers/DocumentController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    },
});

const upload = multer({
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
        } else {
            cb(null, true); // Allow all for demo, log warning
            console.warn('File type may not be supported:', file.mimetype);
        }
    },
});

// All routes require authentication
router.use(authenticateToken);

// GET /api/documents - Get all documents
router.get('/', DocumentController.getAllDocuments.bind(DocumentController));

// POST /api/documents - Upload document
router.post(
    '/',
    apiLimiter,
    upload.single('file'),
    DocumentController.createDocument.bind(DocumentController)
);

// GET /api/documents/trash - Get deleted documents (must be before :id route)
router.get('/trash', DocumentController.getDeletedDocuments.bind(DocumentController));

// GET /api/documents/storage - Get storage statistics
router.get('/storage', DocumentController.getStorageStats.bind(DocumentController));

// GET /api/documents/:id/download - Download document
router.get('/:id/download', DocumentController.downloadDocument.bind(DocumentController));

// POST /api/documents/:id/restore - Restore from trash
router.post('/:id/restore', apiLimiter, DocumentController.restoreDocument.bind(DocumentController));

// DELETE /api/documents/:id - Soft delete (move to trash)
router.delete('/:id', apiLimiter, DocumentController.deleteDocument.bind(DocumentController));

// DELETE /api/documents/:id/permanent - Permanent delete
router.delete('/:id/permanent', apiLimiter, DocumentController.permanentDeleteDocument.bind(DocumentController));

export default router;
