import { User } from '../models/user.model.js';
import { Message } from '../models/message.model.js';
import { Friendship, friendIds, areFriends } from '../models/friendship.model.js';
import { refreshSocial } from '../lib/socket.js';
const publicFields = 'authUserId fullName imageUrl';
export const getAllUsers = async (req, res, next) => {
    try { res.json(await User.find({ authUserId: { $in: await friendIds(req.userId) } }).select(publicFields)); } catch (e) { next(e); }
};
export const getSocial = async (req, res, next) => {
    try {
        const requests = await Friendship.find({ status: 'pending', $or: [{ requester: req.userId }, { recipient: req.userId }] });
        const people = await User.find({ authUserId: { $in: requests.flatMap(r => [r.requester, r.recipient]) } }).select(publicFields);
        res.json(requests.map(r => ({ _id: r.id, incoming: r.recipient === req.userId, user: people.find(u => u.authUserId === (r.requester === req.userId ? r.recipient : r.requester)) })).filter(r => r.user));
    } catch (e) { next(e); }
};
export const searchUsers = async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim().slice(0, 100);
        if (q.length < 2) return res.json([]);
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const users = await User.find({ authUserId: { $ne: req.userId }, $or: [{ fullName: { $regex: escaped, $options: 'i' } }, { email: q.toLowerCase() }] }).select(publicFields).limit(20);
        const relations = await Friendship.find({ $or: [{ requester: req.userId }, { recipient: req.userId }] });
        res.json(users.map(u => { const r = relations.find(r => r.requester === u.authUserId || r.recipient === u.authUserId); return { ...u.toObject(), relationship: !r ? 'none' : r.status === 'accepted' ? 'friends' : r.requester === req.userId ? 'sent' : 'incoming' }; }));
    } catch (e) { next(e); }
};
export const requestFriend = async (req, res, next) => {
    try {
        const recipient = req.params.userId;
        if (recipient === req.userId) return res.status(400).json({ message: 'You cannot add yourself' });
        if (!await User.exists({ authUserId: recipient })) return res.status(404).json({ message: 'User not found' });
        const pair = JSON.stringify([req.userId, recipient].sort());
        const result = await Friendship.findOneAndUpdate({ pair }, { $setOnInsert: { pair, requester: req.userId, recipient, status: 'pending' } }, { upsert: true, new: true });
        await refreshSocial([req.userId, recipient]);
        res.json(result);
    } catch (e) { if (e.code === 11000) return res.status(409).json({ message: 'Request already exists' }); next(e); }
};
export const respondRequest = async (req, res, next) => {
    try {
        if (!['accept', 'decline', 'cancel'].includes(req.body.action)) return res.status(400).json({ message: 'Invalid action' });
        const filter = { _id: req.params.id, status: 'pending', [req.body.action === 'cancel' ? 'requester' : 'recipient']: req.userId };
        if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(404).json({ message: 'Request not found' });
        const request = req.body.action === 'accept' ? await Friendship.findOneAndUpdate(filter, { status: 'accepted' }, { new: true }) : await Friendship.findOneAndDelete(filter);
        if (!request) return res.status(404).json({ message: 'Request not found' });
        await refreshSocial([request.requester, request.recipient]);
        res.json({ success: true });
    } catch (e) { next(e); }
};
export const getMessages = async (req, res, next) => {
    try {
        const myId = req.userId, userId = req.params.userId;
        if (!await areFriends(myId, userId)) return res.status(403).json({ message: 'Only friends can chat' });
        res.json(await Message.find({ $or: [{ senderId: userId, receiverId: myId }, { senderId: myId, receiverId: userId }] }).sort({ createdAt: 1 }));
    } catch (e) { next(e); }
};
