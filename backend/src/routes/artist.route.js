import { ArtistFollow } from '../models/artist-follow.model.js';
import { auth } from '../lib/auth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { Router } from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { User } from '../models/user.model.js';
import { Song } from '../models/song.model.js';
import { Album } from '../models/album.model.js';
import { ProjectCover } from '../models/project-cover.model.js';
import { createStoredImage } from '../lib/stored-image.js';

const router = Router();
const fields = 'authUserId fullName email imageUrl artistName artistBio artistWebsite artistPhoto';
const profileView = user => ({
    id: user.authUserId,
    name: user.artistName || (user.fullName === user.email ? 'Lyre artist' : user.fullName),
    bio: user.artistBio || '',
    website: user.artistWebsite || '',
    photoUrl: user.artistPhoto
        ? `/api/artists/${encodeURIComponent(user.authUserId)}/photo?v=${user.artistPhoto}`
        : user.imageUrl || '',
});
router.use((_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });

router.get('/following', protectRoute, async (req, res) => {
    const follows = await ArtistFollow.find({ followerId: req.userId }).select('artistId');
    const users = await User.find({ authUserId: { $in: follows.map(f => f.artistId) } }).select(fields);
    res.json(users.map(profileView));
});
router.post('/:id/follow', protectRoute, async (req, res) => {
    if (typeof req.body?.follow !== 'boolean') return res.status(400).json({ message: 'Specify whether to follow this artist' });
    if (req.params.id === req.userId) return res.status(400).json({ message: 'You cannot follow yourself' });
    if (!await User.exists({ authUserId: req.params.id })) return res.status(404).json({ message: 'Artist profile not found' });
    const filter = { followerId: req.userId, artistId: req.params.id };
    if (req.body.follow) {
        try { await ArtistFollow.updateOne(filter, { $setOnInsert: filter }, { upsert: true }); }
        catch (error) { if (error.code !== 11000) throw error; }
    } else await ArtistFollow.deleteOne(filter);
    res.json({ isFollowing: req.body.follow, followerCount: await ArtistFollow.countDocuments({ artistId: req.params.id }) });
});

router.get('/:id', async (req, res) => {
    const user = await User.findOne({ authUserId: req.params.id }).select(fields);
    if (!user) return res.status(404).json({ message: 'Artist profile not found' });
    const uploads = { uploadedByUserId: user.authUserId };
    const [tracks, albums] = await Promise.all([
        Song.find(uploads).sort({ createdAt: -1 }).limit(100)
            .select('title artist artists imageUrl audioUrl duration albumId createdAt updatedAt'),
        Album.find(uploads).sort({ createdAt: -1 }).limit(100)
            .select('title artist imageUrl releaseYear'),
    ]);
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    const [following, followerCount] = await Promise.all([
        session?.user ? ArtistFollow.exists({ followerId: session.user.id, artistId: user.authUserId }) : null,
        ArtistFollow.countDocuments({ artistId: user.authUserId }),
    ]);
    res.json({ ...profileView(user), tracks, albums, isFollowing: Boolean(following), followerCount });
});

router.get('/:id/photo', async (req, res) => {
    const user = await User.findOne({ authUserId: req.params.id }).select('artistPhoto');
    if (!user?.artistPhoto) return res.status(404).end();
    const image = await ProjectCover.findById(user.artistPhoto);
    if (!image) return res.status(404).end();
    res.set('X-Content-Type-Options', 'nosniff').type(image.contentType).send(image.bytes);
});

router.patch('/me', protectRoute, async (req, res) => {
    const { name, bio = '', website = '' } = req.body ?? {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || typeof bio !== 'string' || bio.length > 1200 || typeof website !== 'string' || website.length > 500)
        return res.status(400).json({ message: 'Check the artist name, bio, and website lengths.' });
    let safeWebsite = '';
    if (website.trim()) {
        try {
            const url = new URL(website.trim());
            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
            safeWebsite = url.href;
        } catch { return res.status(400).json({ message: 'Enter an HTTP or HTTPS website URL.' }); }
    }
    const previousPhoto = req.appUser.artistPhoto;
    let photo;
    if (req.files?.photo) {
        try { photo = await createStoredImage(req.files.photo); }
        catch (error) {
            if (error.status === 400) return res.status(400).json({ message: error.message });
            throw error;
        }
    }
    const filter = { authUserId: req.userId, ...(photo ? { artistPhoto: previousPhoto ?? null } : {}) };
    const user = await User.findOneAndUpdate(filter, { $set: {
        artistName: name.trim(), artistBio: bio.trim(), artistWebsite: safeWebsite,
        ...(photo ? { artistPhoto: photo._id } : {}),
    } }, { returnDocument: 'after' }).select(fields);
    if (!user) {
        if (photo) await ProjectCover.deleteOne({ _id: photo._id });
        return res.status(409).json({ message: 'Profile changed elsewhere. Reload and try again.' });
    }
    if (photo && previousPhoto) await ProjectCover.deleteOne({ _id: previousPhoto }).catch(() => {});
    res.json(profileView(user));
});

export default router;
