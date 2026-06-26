import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------
export interface StorageBackend {
    upload(params: { key: string; body: Buffer; contentType: string }): Promise<string>;
    download(key: string): Promise<{ body: Readable; contentType: string; contentLength?: number }>;
    delete(key: string): Promise<void>;
    getPublicUrl(key: string): string | null;
    getStorageUsed(): Promise<number>;
}

// ---------------------------------------------------------------------------
// R2 (S3-compatible) Backend
// ---------------------------------------------------------------------------
class R2StorageBackend implements StorageBackend {
    private client: S3Client;
    private bucket: string;
    private publicUrl: string | undefined;

    constructor() {
        if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
            throw new Error('Missing R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY');
        }
        this.client = new S3Client({
            region: 'auto',
            endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
            },
        });
        this.bucket = process.env.R2_BUCKET_NAME || 'hari-uploads';
        this.publicUrl = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxxx.r2.dev
    }

    async upload(params: { key: string; body: Buffer; contentType: string }): Promise<string> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: params.key,
                Body: params.body,
                ContentType: params.contentType,
            }),
        );
        return params.key;
    }

    async download(key: string): Promise<{ body: Readable; contentType: string; contentLength?: number }> {
        const res = await this.client.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        return {
            body: res.Body as Readable,
            contentType: res.ContentType || 'application/octet-stream',
            contentLength: res.ContentLength,
        };
    }

    async delete(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    getPublicUrl(key: string): string | null {
        if (!this.publicUrl) return null;
        return `${this.publicUrl.replace(/\/+$/, '')}/${key}`;
    }

    async getStorageUsed(): Promise<number> {
        let total = 0;
        let continuationToken: string | undefined;

        do {
            const res = await this.client.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    ContinuationToken: continuationToken,
                }),
            );
            for (const obj of res.Contents || []) {
                total += obj.Size || 0;
            }
            continuationToken = res.NextContinuationToken;
        } while (continuationToken);

        return total;
    }
}

// ---------------------------------------------------------------------------
// Local Disk Backend
// ---------------------------------------------------------------------------
class LocalStorageBackend implements StorageBackend {
    private baseDir: string;

    constructor() {
        this.baseDir = path.resolve(__dirname, '../../uploads');
    }

    /** Resolve key to a safe path within baseDir (prevent path traversal) */
    private safePath(key: string): string {
        const resolved = path.resolve(this.baseDir, key);
        if (!resolved.startsWith(this.baseDir + path.sep) && resolved !== this.baseDir) {
            throw new Error('Invalid storage key');
        }
        return resolved;
    }

    async upload(params: { key: string; body: Buffer; contentType: string }): Promise<string> {
        const filePath = this.safePath(params.key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, params.body);
        return params.key;
    }

    async download(key: string): Promise<{ body: Readable; contentType: string; contentLength?: number }> {
        const filePath = this.safePath(key);
        if (!fs.existsSync(filePath)) {
            throw new Error('File not found on disk');
        }
        const stat = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
        };
        return {
            body: fs.createReadStream(filePath),
            contentType: mimeMap[ext] || 'application/octet-stream',
            contentLength: stat.size,
        };
    }

    async delete(key: string): Promise<void> {
        const filePath = this.safePath(key);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    getPublicUrl(key: string): string | null {
        return `/uploads/${key}`;
    }

    async getStorageUsed(): Promise<number> {
        return this.getDirectorySize(this.baseDir);
    }

    private getDirectorySize(dirPath: string): number {
        if (!fs.existsSync(dirPath)) return 0;
        let total = 0;
        for (const entry of fs.readdirSync(dirPath)) {
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);
            total += stat.isDirectory() ? this.getDirectorySize(fullPath) : stat.size;
        }
        return total;
    }
}

// ---------------------------------------------------------------------------
// Factory — pick backend based on environment
// ---------------------------------------------------------------------------
function createStorageBackend(): StorageBackend {
    if (process.env.R2_ACCOUNT_ID) {
        logger.info('[Storage] Using Cloudflare R2 backend');
        return new R2StorageBackend();
    }
    logger.info('[Storage] Using local disk backend');
    return new LocalStorageBackend();
}

export const storageService: StorageBackend = createStorageBackend();
