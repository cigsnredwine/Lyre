import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');
const { betterAuth } = await import(pathToFileURL(require.resolve('better-auth')));
const { mongodbAdapter } = await import(pathToFileURL(require.resolve('better-auth/adapters/mongodb')));
const client = await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
try {
 const db = client.db();
 const auth = betterAuth({ secret: readFileSync(new URL('../runtime.local/auth-secret', import.meta.url), 'utf8'), baseURL: 'http://localhost:5001', database: mongodbAdapter(db), emailAndPassword: { enabled: true } });
 const users = {};
 for (const [key, name] of [['alex','Alex Rivera'],['maya','Maya Chen'],['sam','Sam Taylor'],['jordan','Jordan Lee']]) {
  const email = `${key}@lyre.test`;
  let user = await db.collection('user').findOne({ email });
  if (!user) { await auth.api.signUpEmail({ body: { email, name, password: 'LyreTest123!' } }); user = await db.collection('user').findOne({ email }); }
  const id = String(user.id || user._id); users[key] = id;
  await db.collection('users').updateOne({ authUserId: id }, { $set: { email, fullName: name, imageUrl: '', updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
 }
 const admin = await db.collection('user').findOne({ email: 'admin@lyre.test' });
 if (!admin) throw Error('Start local backend first');
 const adminId = String(admin.id || admin._id);
 for (const [requester,recipient,status] of [[adminId,users.alex,'accepted'],[users.maya,adminId,'pending'],[adminId,users.sam,'pending']]) {
  const pair = JSON.stringify([requester,recipient].sort());
  await db.collection('friendships').updateOne({ pair }, { $setOnInsert: { pair, requester, recipient, status, createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
 }
 await db.collection('messages').updateOne({ senderId: users.alex, receiverId: adminId, content: 'Hey! What are you listening to today?' }, { $setOnInsert: { createdAt: new Date(), updatedAt: new Date() } }, { upsert: true });
 console.log('Seeded Alex (friend + chat), Maya (incoming), Sam (outgoing), Jordan (not a friend). Password: LyreTest123!');
} finally { await client.close(); }
