import mongoose from 'mongoose';
const schema = new mongoose.Schema({
    pair: { type: String, required: true, unique: true },
    requester: { type: String, required: true },
    recipient: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
}, { timestamps: true });
export const Friendship = mongoose.model('Friendship', schema);
export const friendIds = async (userId) => (await Friendship.find({ status: 'accepted', $or: [{ requester: userId }, { recipient: userId }] })).map(f => f.requester === userId ? f.recipient : f.requester);
export const areFriends = async (a, b) => a !== b && Boolean(await Friendship.exists({ pair: JSON.stringify([a, b].sort()), status: 'accepted' }));
