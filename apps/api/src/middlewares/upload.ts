import multer, { StorageEngine } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Storage engine: memoryStorage for R2, diskStorage for local fallback
// ---------------------------------------------------------------------------
const useR2 = !!process.env.R2_ACCOUNT_ID;

function buildDiskStorage(dest: string): StorageEngine {
    return multer.diskStorage({
        destination: (_req, _file, cb) => {
            const uploadDir = path.join(__dirname, '../../uploads', dest);
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${ext}`);
        },
    });
}

const storage: StorageEngine = useR2
    ? multer.memoryStorage()
    : buildDiskStorage(''); // base uploads dir (each multer instance overrides via dest if needed)

// ---------------------------------------------------------------------------
// File filters
// ---------------------------------------------------------------------------
const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
    }
};

const documentFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, GIF'));
    }
};

const medicalFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed.'));
    }
};

// ---------------------------------------------------------------------------
// Multer instances
// ---------------------------------------------------------------------------
// Always use memoryStorage for avatars so resizeAvatar middleware can access
// req.file.buffer regardless of storage backend (R2 or local disk).
export const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB pre-compression
    fileFilter: imageFilter,
});

export const documentUpload = multer({
    storage: useR2 ? multer.memoryStorage() : buildDiskStorage(''),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: documentFilter,
});

export const medicalCertUpload = multer({
    storage: useR2 ? multer.memoryStorage() : buildDiskStorage('medical-certs'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: medicalFilter,
});

export const onboardingDocUpload = multer({
    storage: useR2 ? multer.memoryStorage() : buildDiskStorage('onboarding'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: documentFilter,
});

export const receiptUpload = multer({
    storage: useR2 ? multer.memoryStorage() : buildDiskStorage('expense-receipts'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: documentFilter,
});

const csvFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV files are allowed.'));
    }
};

export const csvUpload = multer({
    storage: useR2 ? multer.memoryStorage() : buildDiskStorage('csv-imports'),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: csvFilter,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a storage key for a given folder.
 * e.g. `avatars/avatar-1719000000-abc123.png`
 */
export function generateStorageKey(folder: string, file: Express.Multer.File, prefix?: string): string {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const name = prefix ? `${prefix}-${uniqueSuffix}${ext}` : `${uniqueSuffix}${ext}`;
    return `${folder}/${name}`;
}

/**
 * Get file contents as Buffer — works for both memory and disk storage.
 */
export function getFileBuffer(file: Express.Multer.File): Buffer {
    if (file.buffer) return file.buffer;
    // Disk storage — read from path
    return fs.readFileSync(file.path);
}
