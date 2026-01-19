import { Request, Response } from 'express';
import DocumentService from '../services/DocumentService';
import path from 'path';

export class DocumentController {
    async getAllDocuments(req: Request, res: Response): Promise<void> {
        try {
            const documents = await DocumentService.getAllDocuments();
            res.json(documents);
        } catch (error: any) {
            console.error('Get documents error:', error);
            res.status(500).json({ error: 'Failed to fetch documents' });
        }
    }

    async createDocument(req: Request, res: Response): Promise<void> {
        try {
            const file = (req as any).file;
            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            const { category, ownerName, employeeId } = req.body;

            if (!category || !ownerName || !employeeId) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const documentData = {
                name: file.originalname,
                type: path.extname(file.originalname).substring(1).toUpperCase(),
                size: file.size,
                category,
                ownerName,
                employeeId,
                filePath: file.path,
            };

            const document = await DocumentService.createDocument(documentData);
            res.status(201).json(document);
        } catch (error: any) {
            console.error('Create document error:', error);
            res.status(400).json({ error: error.message || 'Failed to upload document' });
        }
    }

    async downloadDocument(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const filePath = await DocumentService.getDocumentFilePath(id);

            res.download(filePath, (err) => {
                if (err) {
                    console.error('Download error:', err);
                    res.status(500).json({ error: 'Failed to download file' });
                }
            });
        } catch (error: any) {
            console.error('Download document error:', error);
            if (error.message === 'Document not found' || error.message === 'File not found on disk') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to download document' });
            }
        }
    }

    async deleteDocument(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await DocumentService.deleteDocument(id);
            res.json({ message: 'Document deleted successfully' });
        } catch (error: any) {
            console.error('Delete document error:', error);
            if (error.message === 'Document not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Failed to delete document' });
            }
        }
    }
}

export default new DocumentController();
