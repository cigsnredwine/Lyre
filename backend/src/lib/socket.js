import { Server } from 'socket.io';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth.js';
import { Message } from '../models/message.model.js';
import { friendIds, areFriends } from '../models/friendship.model.js';
let io;
const activities = new Map();
const room = id => `user:${id}`;
const online = id => Boolean(io?.sockets.adapter.rooms.get(room(id))?.size);
const snapshot = async id => {
    const friends = await friendIds(id);
    io.to(room(id)).emit('users_online', friends.filter(online));
    io.to(room(id)).emit('activities', friends.filter(online).map(id => [id, activities.get(id) || 'Idle']));
};
export const refreshSocial = async ids => {
    if (!io) return;
    for (const id of ids) { await snapshot(id); io.to(room(id)).emit('friends_changed'); }
};
export const initializeSocket = server => {
    io = new Server(server, { cors: { origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(s => s.trim()), credentials: true } });
    io.use(async (socket, next) => {
        try {
            const session = await auth.api.getSession({ headers: fromNodeHeaders(socket.request.headers) });
            if (!session?.user) return next(new Error('Unauthorized'));
            socket.data.userId = session.user.id;
            next();
        } catch { next(new Error('Unauthorized')); }
    });
    io.on('connection', async socket => {
        const userId = socket.data.userId;
        await socket.join(room(userId));
        const notifyPresence = async () => {
            await snapshot(userId);
            for (const id of await friendIds(userId)) await snapshot(id);
        };
        socket.on('update_activity', async data => {
            if (typeof data?.activity !== 'string' || data.activity.length > 500) return;
            activities.set(userId, data.activity);
            for (const id of await friendIds(userId)) io.to(room(id)).emit('activity_updated', { userId, activity: data.activity });
        });
        socket.on('send_message', async (data, ack) => {
            const reply = typeof ack === 'function' ? ack : () => {};
            try {
                const { receiverId, content } = data || {};
                if (typeof receiverId !== 'string' || typeof content !== 'string' || !content.trim() || content.trim().length > 4000) return reply({ error: 'Enter a message of 1–4000 characters' });
                if (!await areFriends(userId, receiverId)) return reply({ error: 'Only friends can chat' });
                const message = await Message.create({ senderId: userId, receiverId, content: content.trim() });
                io.to(room(receiverId)).emit('receive_message', message);
                io.to(room(userId)).emit('message_sent', message);
                reply({ success: true });
            } catch { reply({ error: 'Message could not be sent' }); }
        });
        socket.on('disconnect', () => {
            if (!online(userId)) activities.delete(userId);
            notifyPresence().catch(console.error);
        });
        notifyPresence().catch(console.error);
    });
};
