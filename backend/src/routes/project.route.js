import { Router } from 'express';
import { randomUUID, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.js';
import { Project } from '../models/project.model.js';
const router = Router();
const storage = path.resolve(process.env.PROJECT_STORAGE_DIR || 'project-storage');
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(error => {
    if (error.status === 400 || error.name === 'ValidationError' || error.name === 'CastError')
        return res.status(400).json({ message: error.message });
    next(error);
});
// Authentication is optional for public projects and unlisted sharing links.
router.use(async (req, res, next) => {
    try {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        req.projectUser = session?.user || null;
        next();
    }
    catch (e) {
        next(e);
    }
});
const signedIn = (req, res, next) => req.projectUser ? next() : res.status(401).json({ message: 'Sign in to continue' });
const owner = (p, req) => p.ownerId === req.projectUser?.id;
const collaborator = (p, req) => owner(p, req) || (p.visibility !== 'private' && p.invitedEmails.includes(req.projectUser?.email?.toLowerCase()));
const access = (p, req) => collaborator(p, req) || p.visibility === 'public' || (p.visibility === 'unlisted' && req.query.share === p.shareToken);
const load = async (req, res, next) => {
    try {
        if (!/^[a-f\d]{24}$/i.test(req.params.id))
            return res.status(404).json({ message: 'Project not found' });
        const p = await Project.findById(req.params.id);
        if (!p || !access(p, req))
            return res.status(404).json({ message: 'This project is private or the sharing link is no longer available.' });
        req.project = p;
        next();
    }
    catch (e) {
        next(e);
    }
};
const requireOwner = (req, res, next) => owner(req.project, req) ? next() : res.status(403).json({ message: 'Only the artist can make this change' });
const validDuration = value => { const seconds = Number(value); if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 86400)
    throw Object.assign(Error('Audio duration must be between 0 and 86400 seconds'), { status: 400 }); return seconds; };
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const view = (p, req, summary = false) => {
    const canEdit = owner(p, req), canListenPrivate = collaborator(p, req);
    const value = p.toObject();
    value.isOwner = canEdit;
    value.isCollaborator = canListenPrivate;
    value.isFollowing = p.followers.includes(req.projectUser?.id);
    value.followerCount = p.followers.length;
    delete value.followers;
    delete value.__v;
    if (!canEdit) {
        delete value.shareToken;
        delete value.invitedEmails;
    }
    value.versions = value.versions.filter(v => canListenPrivate || v.isPublic).map(v => {
        const { file, sourceUrl, ...rest } = v;
        return { ...rest, audioUrl: `/api/projects/${p.id}/media/${v._id}` };
    });
    value.coverUrl = p.coverFile ? `/api/projects/${p.id}/cover` : p.coverUrl;
    delete value.coverFile;
    value.posts = value.posts.map(post => ({ ...post, imageUrl: post.image ? `/api/projects/${p.id}/images/${post._id}` : null, image: undefined }));
    const visible = new Set(value.versions.map(v => String(v._id)));
    value.comments = value.comments.filter(c => visible.has(c.versionId));
    if (summary) {
        delete value.comments;
        delete value.posts;
        delete value.shareToken;
        delete value.invitedEmails;
    }
    return value;
};
async function saveFile(file, kind) {
    if (!file || Array.isArray(file))
        throw Object.assign(Error(`Choose one ${kind} file`), { status: 400 });
    const ext = path.extname(file.name).toLowerCase();
    const allowed = kind === 'audio' ? ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'] : ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowed.includes(ext) || file.size > (kind === 'audio' ? 50 : 8) * 1024 * 1024)
        throw Object.assign(Error(`Choose a supported ${kind} file under ${kind === 'audio' ? 50 : 8} MB`), { status: 400 });
    await fs.mkdir(storage, { recursive: true });
    const name = `${randomUUID()}${ext}`;
    await file.mv(path.join(storage, name));
    return name;
}
router.get('/', wrap(async (req, res) => {
    const id = req.projectUser?.id;
    let filter = { visibility: 'public' };
    if (req.query.scope === 'mine') {
        if (!id)
            return res.status(401).json({ message: 'Sign in to open your studio' });
        filter = { ownerId: id };
    }
    if (req.query.scope === 'following') {
        if (!id)
            return res.status(401).json({ message: 'Sign in to view updates' });
        filter = { followers: id, $or: [{ visibility: 'public' }, { ownerId: id }, { visibility: { $ne: 'private' }, invitedEmails: req.projectUser.email.toLowerCase() }] };
    }
    if (req.query.scope === 'invited') {
        if (!id)
            return res.status(401).json({ message: 'Sign in to view invitations' });
        filter = { visibility: { $ne: 'private' }, invitedEmails: req.projectUser.email.toLowerCase() };
    }
    res.json((await Project.find(filter).sort({ updatedAt: -1 }).limit(100)).map(p => view(p, req, req.query.details !== 'true')));
}));
router.post('/', signedIn, wrap(async (req, res) => {
    const title = text(req.body.title, 120);
    if (!title || !req.files?.audio)
        return res.status(400).json({ message: 'A title and first audio version are required' });
    const duration = validDuration(req.body.duration);
    const file = await saveFile(req.files.audio, 'audio');
    const coverFile = req.files.cover ? await saveFile(req.files.cover, 'image') : undefined;
    const p = await Project.create({ title, description: text(req.body.description, 3000), ownerId: req.projectUser.id, artist: req.projectUser.name, coverFile, visibility: 'private', shareToken: randomBytes(24).toString('hex'), versions: [{ label: text(req.body.label, 80) || 'First demo', note: text(req.body.note, 2000), file, duration, isPublic: false }] });
    res.status(201).json(view(p, req));
}));
router.get('/:id', load, wrap(async (req, res) => res.json(view(req.project, req))));
router.patch('/:id', signedIn, load, requireOwner, wrap(async (req, res) => {
    const p = req.project;
    if (req.body.title !== undefined) {
        const title = text(req.body.title, 120);
        if (!title)
            return res.status(400).json({ message: 'Title is required' });
        p.title = title;
    }
    if (req.body.description !== undefined)
        p.description = text(req.body.description, 3000);
    if (req.body.visibility !== undefined) {
        if (!['private', 'invited', 'unlisted', 'public'].includes(req.body.visibility))
            return res.status(400).json({ message: 'Invalid visibility' });
        p.visibility = req.body.visibility;
    }
    if (req.body.stage !== undefined) {
        if (!['idea', 'demo', 'in-progress', 'released'].includes(req.body.stage))
            return res.status(400).json({ message: 'Invalid stage' });
        p.stage = req.body.stage;
    }
    if (req.body.invitedEmails !== undefined) {
        if (!Array.isArray(req.body.invitedEmails) || req.body.invitedEmails.length > 30 || req.body.invitedEmails.some(e => typeof e !== 'string' || !/^\S+@\S+\.\S+$/.test(e)))
            return res.status(400).json({ message: 'Enter valid email addresses (up to 30)' });
        p.invitedEmails = [...new Set(req.body.invitedEmails.map(e => e.trim().toLowerCase()))];
    }
    if (req.body.rotateLink)
        p.shareToken = randomBytes(24).toString('hex');
    await p.save();
    res.json(view(p, req));
}));
router.post('/:id/versions', signedIn, load, requireOwner, wrap(async (req, res) => {
    if (!req.files?.audio)
        return res.status(400).json({ message: 'Choose an audio file' });
    const label = text(req.body.label, 80);
    if (!label)
        return res.status(400).json({ message: 'Give this version a name' });
    const duration = validDuration(req.body.duration);
    const file = await saveFile(req.files.audio, 'audio');
    req.project.versions.push({ label, note: text(req.body.note, 2000), file, duration, isPublic: req.body.isPublic === 'true' });
    await req.project.save();
    res.status(201).json(view(req.project, req));
}));
router.patch('/:id/versions/:versionId', signedIn, load, requireOwner, wrap(async (req, res) => {
    const v = req.project.versions.id(req.params.versionId);
    if (!v)
        return res.status(404).json({ message: 'Version not found' });
    const { label, note, isPublic } = req.body;
    if (label === undefined && note === undefined && isPublic === undefined)
        return res.status(400).json({ message: 'Provide version changes' });
    if (label !== undefined && (typeof label !== 'string' || !label.trim() || label.trim().length > 80))
        return res.status(400).json({ message: 'Version name must contain 1–80 characters' });
    if (note !== undefined && (typeof note !== 'string' || note.length > 2000))
        return res.status(400).json({ message: 'Version note must be at most 2000 characters' });
    if (isPublic !== undefined && typeof isPublic !== 'boolean')
        return res.status(400).json({ message: 'Set version visibility' });
    if (label !== undefined) v.label = label.trim();
    if (note !== undefined) v.note = note.trim();
    if (isPublic !== undefined) v.isPublic = isPublic;
    await req.project.save();
    res.json(view(req.project, req));
}));
router.post('/:id/posts', signedIn, load, requireOwner, wrap(async (req, res) => {
    const body = text(req.body.body, 5000);
    if (!body)
        return res.status(400).json({ message: 'Write a note for your project' });
    const image = req.files?.image ? await saveFile(req.files.image, 'image') : undefined;
    req.project.posts.push({ body, image, kind: 'note' });
    await req.project.save();
    res.status(201).json(view(req.project, req));
}));
router.patch('/:id/posts/:postId', signedIn, load, requireOwner, wrap(async (req, res) => {
    const post = req.project.posts.id(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (typeof req.body.body !== 'string' || !req.body.body.trim() || req.body.body.length > 5000)
        return res.status(400).json({ message: 'Post must contain 1–5000 characters' });
    post.body = req.body.body.trim();
    await req.project.save();
    res.json(view(req.project, req));
}));
router.post('/:id/comments', signedIn, load, wrap(async (req, res) => {
    const p = req.project, v = p.versions.id(req.body.versionId), body = text(req.body.body, 2000), timestamp = req.body.timestamp;
    if (!v || (!collaborator(p, req) && !v.isPublic))
        return res.status(403).json({ message: 'This version is private' });
    if (!body || (timestamp !== undefined && (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0 || timestamp > v.duration)))
        return res.status(400).json({ message: 'Write feedback and choose a valid timestamp' });
    // Atomic append keeps simultaneous feedback from overwriting another listener’s comment.
    await Project.updateOne({ _id: p._id }, { $push: { comments: { authorId: req.projectUser.id, authorName: req.projectUser.name, body, versionId: String(v._id), timestamp, createdAt: new Date(), updatedAt: new Date() } }, $set: { updatedAt: new Date() } });
    res.status(201).json(view(await Project.findById(p._id), req));
}));
router.post('/:id/follow', signedIn, load, wrap(async (req, res) => {
    const update = req.body.follow === false ? { $pull: { followers: req.projectUser.id } } : { $addToSet: { followers: req.projectUser.id } };
    await Project.updateOne({ _id: req.project._id }, update);
    res.json(view(await Project.findById(req.project._id), req));
}));
router.get('/:id/media/:versionId', load, wrap(async (req, res) => {
    const p = req.project, v = p.versions.id(req.params.versionId);
    if (!v || (!collaborator(p, req) && !v.isPublic))
        return res.status(404).end();
    res.set('Cache-Control', 'private, no-store');
    if (v.file)
        return res.sendFile(path.join(storage, path.basename(v.file)));
    // Seeded samples use the existing local media. New uploads are always protected here.
    const publicDir = path.resolve(new URL('../../../frontend/public', import.meta.url).pathname);
    const file = path.resolve(publicDir, `.${v.sourceUrl}`);
    if (!file.startsWith(publicDir + path.sep))
        return res.status(404).end();
    res.sendFile(file);
}));
router.get('/:id/cover', load, wrap(async (req, res) => { if (!req.project.coverFile)
    return res.status(404).end(); res.set('Cache-Control', 'private, no-store'); res.sendFile(path.join(storage, path.basename(req.project.coverFile))); }));
router.get('/:id/images/:postId', load, wrap(async (req, res) => { const post = req.project.posts.id(req.params.postId); if (!post?.image)
    return res.status(404).end(); res.set('Cache-Control', 'private, no-store'); res.sendFile(path.join(storage, path.basename(post.image))); }));
export default router;
