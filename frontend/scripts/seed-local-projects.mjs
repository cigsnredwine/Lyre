import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { mkdir, copyFile } from 'node:fs/promises';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient, ObjectId } = require('mongodb');
const storage = new URL('../runtime.local/project-storage/', import.meta.url);
await mkdir(storage, { recursive: true });
for (const [source, target] of [['songs/19 master.wav', 'seed-19.wav'], ['songs/midsummer mastered.wav', 'seed-midsummer.wav'], ['songs/INTRO.wav', 'seed-intro.wav'], ['lyre-bg.jpg', 'seed-notebook.jpg']])
    await copyFile(new URL(`../public/${source}`, import.meta.url), new URL(target, storage));
const client = await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
try {
    const db = client.db();
    const user = await db.collection('user').findOne({ email: 'admin@lyre.test' });
    if (!user)
        throw Error('Start local backend first');
    const ownerId = String(user.id || user._id);
    const ago = d => new Date(Date.now() - d * 86400000);
    const version = (label, note, file, duration, isPublic, days) => ({ _id: new ObjectId(), label, note, file, duration, isPublic, createdAt: ago(days), updatedAt: ago(days) });
    const post = (body, days, image) => ({ _id: new ObjectId(), body, image, kind: 'note', createdAt: ago(days), updatedAt: ago(days) });
    const projects = [
        { title: '19', description: 'An open notebook for a song about holding onto a moment a little longer. Following the melody from its first sketch to a finished recording.', visibility: 'public', stage: 'in-progress', coverUrl: '/cover-images/khi nao em tien temp cover.jpg', versions: [version('Opening sketch', 'A filtered, 38-second excerpt of the local recording, made for testing the version workflow.', 'seed-first-demo.mp3', 38, true, 9), version('Full recording', 'The full local recording. A second version to compare with the opening sketch.', 'seed-19.wav', 204, true, 5)], posts: [post('The small details are what I keep coming back to. Leaving a little space around the vocal, letting the last word sit for a moment before the next line arrives.\n\nThis is a sample studio notebook. Use it to try posting your own notes, photos, and revisions.', 2, 'seed-notebook.jpg'), post('A thought for the next pass:\n\nWhat if the ending felt less like an answer, and more like a place you could stay? Keeping that question here before I forget it.', 7)], invitedEmails: ['alex@lyre.test'], followers: [] },
        { title: 'midsummer', description: 'A private listening room for a warm-weather idea. Sharing early takes with a few trusted ears before opening the doors.', visibility: 'invited', stage: 'demo', versions: [version('First listening session', 'Local sample recording for collaborator feedback.', 'seed-midsummer.wav', 204, false, 6)], posts: [post('A space to collect the little things: a melody, a phrase, a change of direction. Alex is invited to leave feedback on this first pass.', 4)], invitedEmails: ['alex@lyre.test'], followers: [] },
        { title: 'a little beginning', description: 'No big plan yet. Just a short idea worth coming back to. A private place to see where it goes.', visibility: 'private', stage: 'idea', versions: [version('A small idea', 'A short local audio sample. Still just for me.', 'seed-intro.wav', 28, false, 1)], posts: [], invitedEmails: [], followers: [] },
    ];
    for (const p of projects) {
        const existing = await db.collection('projects').findOne({ ownerId, title: p.title });
        if (existing) {
            console.log(`Kept existing project: ${p.title} (${existing._id})`);
            continue;
        }
        const result = await db.collection('projects').insertOne({ ...p, ownerId, artist: 'hien long', shareToken: randomBytes(24).toString('hex'), comments: p.title === '19' ? [{ _id: new ObjectId(), authorId: 'local-demo-listener', authorName: 'Alex Rivera', body: 'Love the space before the vocal comes back in. I’d keep that breath in the next take.', versionId: String(p.versions[1]._id), timestamp: 24, createdAt: ago(3), updatedAt: ago(3) }] : [], createdAt: ago(10), updatedAt: ago(p.title === '19' ? 2 : p.title === 'midsummer' ? 4 : 1) });
        console.log(`${p.title}: http://localhost:3000/projects/${result.insertedId}`);
    }
}
finally {
    await client.close();
}
