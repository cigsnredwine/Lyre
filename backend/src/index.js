import express from "express";
import dotenv from "dotenv";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import cron from "node-cron";
import fs from "fs";
import { toNodeHandler } from "better-auth/node";

import { connectDB } from "./lib/db.js";
import projectRoutes from "./routes/project.route.js";
import artistRoutes from "./routes/artist.route.js";
import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import uploadRoutes from "./routes/upload.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statsRoutes from "./routes/stats.route.js";
import { createServer } from "http";
import { initializeSocket } from "./lib/socket.js";
import { auth } from "./lib/auth.js";
import { randomUUID } from "node:crypto";


dotenv.config();

const __dirname = path.resolve();
const app = express();
const PORT = process.env.PORT;
const CLIENT_URLS = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const authOrigin = new URL(process.env.BETTER_AUTH_URL || "http://localhost:5001").origin;
const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    return origin === authOrigin || CLIENT_URLS.includes(origin);
};

const httpServer = createServer(app);
initializeSocket(httpServer);
const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

app.use(cors({
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use("/api/auth", toNodeHandler(auth));
app.use(express.json()); // to parse req.body
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    abortOnLimit: true,
    responseOnLimit: `File size exceeds the ${Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024))}MB upload limit.`,
    limits: {
        fileSize: MAX_UPLOAD_SIZE_BYTES
    }
}));

app.use((req, res, next) => {
    const requestId = randomUUID();
    const started = process.hrtime.bigint();

    res.setHeader("X-Request-ID", requestId);

    res.on("finish", () => {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: "http_request",
            request_id: requestId,
            method: req.method,
            status: res.statusCode,
            duration_ms: Number(
                process.hrtime.bigint() - started
            ) / 1e6
        }));
    });

    next();
});

// cron jobs
// delete temp files after 1 hour
const tempDir = path.join(process.cwd(), "tmp");

cron.schedule("0 * * * *", () => {
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error("Error reading temp directory:", err);
                return;
            }
            for (const file of files) {
                fs.unlink(path.join(tempDir, file), err => { });
            }
        });
    }
})


app.use("/api/projects", projectRoutes);
app.use("/api/artists", artistRoutes);
app.use("/api/users", userRoutes);
app.use("/api/app-auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/stats", statsRoutes);

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../frontend/dist")));
    app.get("/{*splat}", (req, res) => {
        res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
    })
}

// error handler
app.use((err, req, res, next) => {
    res.status(500).json({ message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message });
})
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectDB();
});
