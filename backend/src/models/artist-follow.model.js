import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    followerId: { type: String, required: true },
    artistId: { type: String, required: true },
}, { timestamps: true });
schema.index({ followerId: 1, artistId: 1 }, { unique: true });
export const ArtistFollow = mongoose.model('ArtistFollow', schema);
