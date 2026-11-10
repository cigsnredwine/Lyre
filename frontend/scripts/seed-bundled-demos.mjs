import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';

const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient, ObjectId } = require('mongodb');
const bundle = new URL('../fixtures/studio-demos/', import.meta.url);
const library = new URL('../public/', import.meta.url);
const storage = new URL('../runtime.local/project-storage/', import.meta.url);
const projects = JSON.parse(await readFile(new URL('projects.json', bundle), 'utf8'));

const client = await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
try {
    const db = client.db();
    const email = process.env.LYRE_SEED_EMAIL?.trim().toLowerCase() || 'admin@lyre.test';
    const user = await db.collection('user').findOne({ email });
    if (!user) throw new Error(`Create the local Lyre account ${email} before importing demos.`);
    const ownerId = String(user.id || user._id);
    const collection = db.collection('projects');
    await mkdir(storage, { recursive: true });

    for (const { title, artist, description, stage, cover, versions } of projects) {
        const existing = await collection.findOne({ ownerId, title });
        if (existing) {
            console.log(`Kept existing project: ${title}`);
            continue;
        }

        const id = new ObjectId();
        const now = new Date();
        const storedVersions = [];
        for (const { label, note, duration, audio, libraryAudio } of versions) {
            const versionId = new ObjectId();
            const source = audio ? new URL(audio, bundle) : new URL(libraryAudio, library);
            const file = `bundled-demo-${versionId}${audio ? '.mp3' : '.wav'}`;
            await copyFile(source, new URL(file, storage));
            storedVersions.push({ _id: versionId, label, note, duration, file, isPublic: false, createdAt: now, updatedAt: now });
        }
        const coverFile = cover ? `bundled-cover-${id}.jpg` : undefined;
        if (coverFile) await copyFile(new URL(cover, bundle), new URL(coverFile, storage));
        await collection.insertOne({
            _id: id, ownerId, title, artist, description, stage, coverFile,
            visibility: 'private', shareToken: randomBytes(24).toString('hex'),
            invitedEmails: [], followers: [], versions: storedVersions, posts: [], comments: [],
            createdAt: now, updatedAt: now,
        });
        console.log(`Imported ${title} with ${storedVersions.length} versions`);
    }
} finally {
    await client.close();
}
