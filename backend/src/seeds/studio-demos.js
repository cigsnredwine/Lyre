import { access } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import { MongoClient, ObjectId } from 'mongodb';
import { studioDemoAsset, studioDemos } from '../lib/studio-demo-assets.js';

const email = process.env.LYRE_SEED_EMAIL?.trim().toLowerCase();
const uri = process.env.MONGODB_URI;
const apply = process.argv.includes('--apply');
if (!email || !uri) throw new Error('Set LYRE_SEED_EMAIL and MONGODB_URI before running the studio import.');

const assetReference = (name) => `studio-demo:${name}`;
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
try {
    await client.connect();
    const db = client.db();
    const user = await db.collection('user').findOne({ email }, { projection: { _id: 1, id: 1 } });
    if (!user) throw new Error('The target account must already exist in the selected database.');
    const ownerId = String(user.id || user._id);
    const collection = db.collection('projects');
    for (const demo of studioDemos) {
        if (demo.cover) await access(studioDemoAsset(assetReference(demo.cover), 'cover'));
        for (const version of demo.versions) {
            await access(studioDemoAsset(assetReference(version.audio || version.libraryAudio), 'audio'));
        }
    }
    for (const { title, artist, description, stage, cover, versions } of studioDemos) {
        if (await collection.findOne({ ownerId, title }, { projection: { _id: 1 } })) {
            console.log(`Kept existing project: ${title}`);
            continue;
        }
        if (!apply) {
            console.log(`Would import ${title} privately with ${versions.length} versions`);
            continue;
        }
        const id = new ObjectId(createHash('sha256').update(JSON.stringify(['studio-demos', ownerId, title])).digest('hex').slice(0, 24));
        const now = new Date();
        const project = {
            ownerId, title, artist, description, stage,
            ...(cover ? { coverFile: assetReference(cover) } : {}),
            visibility: 'private', shareToken: randomBytes(24).toString('hex'),
            invitedEmails: [], followers: [], posts: [], comments: [],
            createdAt: now, updatedAt: now,
            versions: versions.map(({ label, note, duration, audio, libraryAudio }) => ({
                _id: new ObjectId(), label, note, duration, file: assetReference(audio || libraryAudio),
                isPublic: false, createdAt: now, updatedAt: now,
            })),
        };
        const result = await collection.updateOne({ _id: id, ownerId }, { $setOnInsert: project }, { upsert: true });
        console.log(`${result.upsertedCount ? 'Imported' : 'Kept'} ${title} (${id})`);
    }
} catch (error) {
    if (error.name.startsWith('Mongo')) console.error(`Studio import database error: ${error.name}${error.code ? ` (${error.code})` : ''}`);
    else console.error(error.message);
    process.exitCode = 1;
} finally {
    await client.close();
}
