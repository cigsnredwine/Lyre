import mongoose from 'mongoose';
const version = new mongoose.Schema({ label: String, note: String, file: String, sourceUrl: String, duration: Number, isPublic: { type: Boolean, default: false } }, { timestamps: true });
const post = new mongoose.Schema({ body: String, image: String, kind: { type: String, default: 'note' } }, { timestamps: true });
const comment = new mongoose.Schema({ authorId: String, authorName: String, body: String, versionId: String, timestamp: Number }, { timestamps: true });
const schema = new mongoose.Schema({
    ownerId: { type: String, required: true, index: true }, artist: String,
    artistCredits: [{ _id: false, name: String, accountId: String }],
    title: { type: String, required: true }, description: { type: String, default: '' },
    coverUrl: String, coverFile: String,
    visibility: { type: String, enum: ['private', 'invited', 'unlisted', 'public'], default: 'private' },
    stage: { type: String, enum: ['idea', 'demo', 'in-progress', 'released'], default: 'demo' },
    shareToken: { type: String, required: true }, invitedEmails: [String], followers: [String],
    versions: [version], posts: [post], comments: [comment],
}, { timestamps: true });
export const Project = mongoose.model('Project', schema);
