import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, unlink } from 'node:fs/promises';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient, ObjectId } = require('mongodb');
const base = 'http://localhost:5001/api';
async function login(email, password) { const r = await fetch(base + '/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' }, body: JSON.stringify({ email, password }) }); assert.equal(r.status, 200); return r.headers.getSetCookie().map(c => c.split(';')[0]).join('; '); }
const cookies = { owner: await login('admin@lyre.test', 'admin'), friend: await login('alex@lyre.test', 'LyreTest123!'), stranger: await login('jordan@lyre.test', 'LyreTest123!') };
async function call(who, path, method = 'GET', body) { const isForm = body instanceof FormData; const r = await fetch(base + '/projects' + path, { method, headers: { ...(cookies[who] ? { Cookie: cookies[who] } : {}), ...(!isForm ? { 'Content-Type': 'application/json' } : {}) }, body: body ? (isForm ? body : JSON.stringify(body)) : undefined }); let data; try {
    data = await r.json();
}
catch { } return { status: r.status, data }; }
const sample = await readFile(new URL('../runtime.local/project-storage/seed-first-demo.mp3', import.meta.url));
const form = () => { const f = new FormData(); f.set('audio', new Blob([sample], { type: 'audio/mpeg' }), 'test.mp3'); f.set('duration', '38'); return f; };
const client = await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
let id;
try {
    const f = form();
    f.set('title', `Integration project ${Date.now()}`);
    f.set('label', 'First test');
    const created = await call('owner', '', 'POST', f);
    assert.equal(created.status, 201);
    id = created.data._id;
    const root = '/' + id;
    const v1 = created.data.versions[0]._id;
    assert.equal(created.data.visibility, 'private');
    assert.equal((await call('anonymous', root)).status, 404);
    assert.equal((await call('stranger', root)).status, 404);
    assert(!(await call('anonymous', '')).data.some(p => p._id === id));
    await call('owner', root, 'PATCH', { visibility: 'invited', invitedEmails: ['alex@lyre.test'] });
    assert.equal((await call('friend', root)).status, 200);
    assert.equal((await call('stranger', root)).status, 404);
    assert((await call('friend', '?scope=invited')).data.some(p => p._id === id));
    assert.equal((await call('friend', root, 'PATCH', { title: 'unauthorized' })).status, 403);
    assert.equal((await call('friend', root + '/comments', 'POST', { body: 'First version feedback', versionId: v1, timestamp: 12 })).status, 201);
    assert.equal((await call('friend', root + '/comments', 'POST', { body: 'Invalid timestamp', versionId: v1, timestamp: 39 })).status, 400);
    const second = form();
    second.set('label', 'Second test');
    second.set('note', 'Changed the ending');
    second.set('isPublic', 'true');
    const revision = await call('owner', root + '/versions', 'POST', second);
    assert.equal(revision.status, 201);
    assert.equal(revision.data.versions.length, 2);
    assert(revision.data.comments.some(c => c.versionId === v1));
    const v2 = revision.data.versions[1]._id;
    assert.equal((await call('friend', root + '/versions/' + v2, 'PATCH', { label: 'Not allowed' })).status, 403);
    assert.equal((await call('owner', root + '/versions/' + v2, 'PATCH', { label: '   ' })).status, 400);
    const edited = await call('owner', root + '/versions/' + v2, 'PATCH', { label: 'Revised name', note: 'Updated version notes', file: 'ignored.wav', duration: 1 });
    assert.equal(edited.status, 200);
    const changed = edited.data.versions.find(v => v._id === v2);
    assert.equal(changed.label, 'Revised name');
    assert.equal(changed.note, 'Updated version notes');
    assert.equal(changed.duration, 38);
    assert.equal(changed.isPublic, true);
    assert.equal(changed.audioUrl, revision.data.versions[1].audioUrl);
    assert.equal(edited.data.versions.length, 2);
    assert(edited.data.comments.some(c => c.versionId === v1));

    const image = await readFile(new URL('../public/albums/2.jpg', import.meta.url));
    const post = new FormData();
    post.set('body', 'A test process note');
    post.set('image', new Blob([image], { type: 'image/jpeg' }), 'test.jpg');
    const posted = await call('owner', root + '/posts', 'POST', post);
    assert.equal(posted.status, 201);
    assert(posted.data.posts[0].imageUrl);
    const postId = posted.data.posts[0]._id;
    assert.equal((await call('friend', root + '/posts/' + postId, 'PATCH', { body: 'Not allowed' })).status, 403);
    assert.equal((await call('owner', root + '/posts/' + postId, 'PATCH', { body: '' })).status, 400);
    const editedPost = await call('owner', root + '/posts/' + postId, 'PATCH', { body: 'Updated process note' });
    assert.equal(editedPost.status, 200);
    assert.equal(editedPost.data.posts[0].body, 'Updated process note');
    assert.equal(editedPost.data.posts[0].imageUrl, posted.data.posts[0].imageUrl);

    const unlisted = await call('owner', root, 'PATCH', { visibility: 'unlisted' });
    const token = unlisted.data.shareToken;
    assert.equal((await call('anonymous', root)).status, 404);
    const shared = await call('anonymous', root + '?share=' + token);
    assert.equal(shared.status, 200);
    assert.equal(shared.data.versions.length, 1);
    assert(!shared.data.comments.length);
    assert(!shared.data.shareToken);
    assert(!shared.data.invitedEmails);
    async function mediaStatus(version, who, token, range) { const r = await fetch(`${base}/projects${root}/media/${version}${token ? '?share=' + token : ''}`, { headers: { ...(cookies[who] ? { Cookie: cookies[who] } : {}), ...(range ? { Range: 'bytes=0-99' } : {}) } }); await r.body?.cancel(); return r.status; }
    assert.equal(await mediaStatus(v1, 'anonymous', token), 404);
    assert.equal(await mediaStatus(v2, 'anonymous', token, true), 206);
    assert.equal(await mediaStatus(v1, 'friend', null, true), 206);
    assert.equal((await call('anonymous', root + '/comments?share=' + token, 'POST', { body: 'anonymous', versionId: v2 })).status, 401);
    assert.equal((await call('stranger', root + '/comments?share=' + token, 'POST', { body: 'hidden', versionId: v1 })).status, 403);
    const rotated = await call('owner', root, 'PATCH', { rotateLink: true });
    assert.notEqual(rotated.data.shareToken, token);
    assert.equal((await call('anonymous', root + '?share=' + token)).status, 404);
    await call('owner', root, 'PATCH', { visibility: 'public' });
    assert((await call('anonymous', '')).data.some(p => p._id === id));
    assert.equal((await call('friend', root + '/follow', 'POST', { follow: true })).status, 200);
    assert((await call('friend', '?scope=following')).data.some(p => p._id === id));
    await call('owner', root, 'PATCH', { visibility: 'private' });
    assert.equal((await call('friend', root)).status, 404);
    assert(!(await call('friend', '?scope=following')).data.some(p => p._id === id));
    assert(!(await call('friend', '?scope=invited')).data.some(p => p._id === id));
    // Delete only the temporary release created by this integration test.
    assert.equal((await call('friend', root + '/versions/' + v1, 'DELETE')).status, 404);
    await call('owner', root, 'PATCH', { visibility: 'public' });
    assert.equal((await call('friend', root + '/versions/' + v1, 'DELETE')).status, 403);
    assert.equal((await call('anonymous', root, 'DELETE')).status, 401);
    const removed = await call('owner', root + '/versions/' + v1, 'DELETE');
    assert.equal(removed.status, 200);
    assert(!removed.data.versions.some(v => v._id === v1));
    assert(!removed.data.comments.some(c => c.versionId === v1));
    assert(removed.data.versions.some(v => v._id === v2));
    assert.equal(await mediaStatus(v1, 'owner', null, true), 404);
    assert.equal((await call('owner', root + '/versions/' + v1, 'PATCH', { label: 'Revive' })).status, 404);
    assert.equal((await call('owner', root + '/versions/' + v1, 'DELETE')).status, 404);
    assert.equal((await call('owner', root + '/versions/' + v2, 'DELETE')).status, 200);
    assert.equal((await call('owner', root)).data.versions.length, 0);
    assert.equal((await call('owner', root, 'DELETE')).status, 204);
    assert.equal((await call('owner', root)).status, 404);
    assert(!(await call('owner', '?scope=mine')).data.some(p => p._id === id));
    assert(!(await call('anonymous', '')).data.some(p => p._id === id));
    console.log('PASS: owner-only release/version deletion, feedback removal, deleted media denied, last-version deletion, deleted releases hidden.');
    console.log('PASS: private creation, collaborator access, owner-only edits, version preservation, image notes, timestamp validation, discovery, unlisted links, link rotation, range requests, private audio boundaries, follows.');
}
finally {
    if (id) {
        const db = client.db();
        const p = await db.collection('projects').findOne({ _id: new ObjectId(id) });
        if (p) {
            for (const file of [...p.versions.map(v => v.file), ...p.posts.map(p => p.image), p.coverFile].filter(Boolean))
                await unlink(new URL('../runtime.local/project-storage/' + file, import.meta.url));
            await db.collection('projects').deleteOne({ _id: p._id });
        }
    }
    await client.close();
}
