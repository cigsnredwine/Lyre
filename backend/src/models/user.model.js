import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    authUserId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    artistName: { type: String, default: "" },
    artistBio: { type: String, default: "" },
    artistWebsite: { type: String, default: "" },
    artistPhoto: { type: mongoose.Schema.Types.ObjectId },
    imageUrl: {
        type: String,
        default: ""
    }
}, {timestamps: true   });
// createdAt updatedAt

export const User = mongoose.model("User", userSchema);
