import fs from 'node:fs/promises';
import { ProjectCover } from '../models/project-cover.model.js';

export async function createStoredImage(file) {
    if (Array.isArray(file) || !file.size || file.size > 8 * 1024 * 1024)
        throw Object.assign(Error('Choose one image under 8 MB'), { status: 400 });
    const bytes = file.tempFilePath ? await fs.readFile(file.tempFilePath) : file.data;
    if (file.tempFilePath) await fs.unlink(file.tempFilePath);
    let contentType;
    if (bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) contentType = 'image/jpeg';
    if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) contentType = 'image/png';
    if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') contentType = 'image/webp';
    if (!contentType) throw Object.assign(Error('Choose a JPEG, PNG, or WebP image'), { status: 400 });
    return ProjectCover.create({ contentType, bytes });
}
