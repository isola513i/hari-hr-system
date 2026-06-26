import { Router } from 'express';
import DocumentController from '../controllers/DocumentController';
import { apiLimiter } from '../middlewares/security';
import { authenticateToken } from '../middlewares/auth';
import { cacheMiddleware, invalidateCache } from '../middlewares/cache';
import { documentUpload } from '../middlewares/upload';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: List all documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by file name or type
 *       - in: query
 *         name: employeeId
 *         schema: { type: string, format: uuid }
 *         description: Filter documents belonging to a specific employee
 *     responses:
 *       200:
 *         description: Paginated list of documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401: { description: Unauthorized }
 */
// GET /api/documents - Get all documents - cached for 30s
router.get('/', cacheMiddleware(), DocumentController.getAllDocuments.bind(DocumentController));

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a new document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *                 description: Employee the document belongs to
 *               category:
 *                 type: string
 *                 description: Document category (e.g. contract, id-card)
 *               description:
 *                 type: string
 *                 description: Optional description
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *       400: { description: Validation error or unsupported file type }
 *       401: { description: Unauthorized }
 *       429: { description: Too many requests }
 */
// POST /api/documents - Upload document
router.post(
    '/',
    apiLimiter,
    documentUpload.single('file'),
    invalidateCache('/api/documents'),
    DocumentController.createDocument.bind(DocumentController)
);

/**
 * @swagger
 * /api/documents/trash:
 *   get:
 *     summary: List soft-deleted documents in trash
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of trashed documents
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401: { description: Unauthorized }
 */
// GET /api/documents/trash - Get deleted documents (must be before :id route) - cached for 30s
router.get('/trash', cacheMiddleware(), DocumentController.getDeletedDocuments.bind(DocumentController));

/**
 * @swagger
 * /api/documents/storage:
 *   get:
 *     summary: Get storage usage statistics
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalFiles: { type: integer, description: Total number of documents }
 *                 totalSize: { type: integer, description: Total storage used in bytes }
 *                 usedMB: { type: number, description: Storage used in megabytes }
 *                 limitMB: { type: number, description: Storage limit in megabytes }
 *       401: { description: Unauthorized }
 */
// GET /api/documents/storage - Get storage statistics - cached for 60s
router.get('/storage', cacheMiddleware(60000), DocumentController.getStorageStats.bind(DocumentController));

/**
 * @swagger
 * /api/documents/{id}/download:
 *   get:
 *     summary: Download a document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document ID
 *     responses:
 *       200:
 *         description: File stream returned for download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401: { description: Unauthorized }
 *       404: { description: Document not found }
 */
// GET /api/documents/:id/download - Download document
router.get('/:id/download', DocumentController.downloadDocument.bind(DocumentController));

/**
 * @swagger
 * /api/documents/{id}/restore:
 *   post:
 *     summary: Restore a trashed document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document ID to restore
 *     responses:
 *       200:
 *         description: Document restored successfully
 *       401: { description: Unauthorized }
 *       404: { description: Document not found in trash }
 *       429: { description: Too many requests }
 */
// POST /api/documents/:id/restore - Restore from trash
router.post('/:id/restore', apiLimiter, invalidateCache('/api/documents'), DocumentController.restoreDocument.bind(DocumentController));

/**
 * @swagger
 * /api/documents/{id}:
 *   delete:
 *     summary: Soft-delete a document (move to trash)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document ID to soft-delete
 *     responses:
 *       200:
 *         description: Document moved to trash successfully
 *       401: { description: Unauthorized }
 *       404: { description: Document not found }
 *       429: { description: Too many requests }
 */
// DELETE /api/documents/:id - Soft delete (move to trash)
router.delete('/:id', apiLimiter, invalidateCache('/api/documents'), DocumentController.deleteDocument.bind(DocumentController));

/**
 * @swagger
 * /api/documents/{id}/permanent:
 *   delete:
 *     summary: Permanently delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Document ID to permanently delete
 *     responses:
 *       200:
 *         description: Document permanently deleted
 *       401: { description: Unauthorized }
 *       404: { description: Document not found }
 *       429: { description: Too many requests }
 */
// DELETE /api/documents/:id/permanent - Permanent delete
router.delete('/:id/permanent', apiLimiter, invalidateCache('/api/documents'), DocumentController.permanentDeleteDocument.bind(DocumentController));

export default router;
