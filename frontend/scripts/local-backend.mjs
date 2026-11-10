import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const frontend = fileURLToPath(new URL('../', import.meta.url));
const backend = path.resolve(frontend, '../backend');
const localDir = path.join(frontend, 'runtime.local');
const requireBackend = createRequire(path.join(backend, 'package.json'));
// Read only Google credentials from these files. Local auth and database settings are isolated below.
for (const file of [path.join(localDir, 'oauth.env'), path.join(backend, '.env')]) {
  if (!existsSync(file)) continue;
  const oauth = requireBackend('dotenv').parse(readFileSync(file));
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']) {
    if (oauth[key]) process.env[key] ??= oauth[key];
  }
}

mkdirSync(localDir, { recursive: true });
const secretFile = path.join(localDir, 'auth-secret');
if (!existsSync(secretFile)) writeFileSync(secretFile, randomBytes(32).toString('hex'), { mode: 0o600 });

// Use the isolated runtime directory and local service configuration.
process.chdir(localDir);
Object.assign(process.env, {
  NODE_ENV: 'development',
  PORT: '5001',
  MONGODB_URI: 'mongodb://127.0.0.1:27018/lyre_local_test',
  CLIENT_URL: 'http://localhost:3000,http://127.0.0.1:3000',
  BETTER_AUTH_URL: 'http://localhost:5001',
  BETTER_AUTH_SECRET: readFileSync(secretFile, 'utf8'),
  BETTER_AUTH_API_KEY: '',
  ADMIN_EMAIL: 'admin@lyre.test',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  DEPLOYMENT_URL: '',
});

const { MongoClient } = await import(pathToFileURL(requireBackend.resolve('mongodb')));
const { betterAuth } = await import(pathToFileURL(requireBackend.resolve('better-auth')));
const { mongodbAdapter } = await import(pathToFileURL(requireBackend.resolve('better-auth/adapters/mongodb')));
const client = await new MongoClient(process.env.MONGODB_URI).connect();
try {
  const db = client.db();
  if (!await db.collection('user').findOne({ email: process.env.ADMIN_EMAIL })) {
    // The short password exception applies only to this isolated local seed.
    const seedAuth = betterAuth({
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      database: mongodbAdapter(db),
      emailAndPassword: { enabled: true, minPasswordLength: 4 },
    });
    await seedAuth.api.signUpEmail({ body: {
      name: 'Development Admin', email: process.env.ADMIN_EMAIL, password: 'admin',
    } });
    console.log('Created local development admin account.');
  }
} finally {
  await client.close();
}
await import(pathToFileURL(path.join(backend, 'src/index.js')));
