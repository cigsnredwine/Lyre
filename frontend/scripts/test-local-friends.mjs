import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { io } from 'socket.io-client';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');
const base = 'http://localhost:5001';
async function login(email, password = 'LyreTest123!') {
 const r = await fetch(`${base}/api/auth/sign-in/email`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:3000' }, body: JSON.stringify({ email, password }) });
 assert.equal(r.status, 200); return r.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
}
const cookies = { admin: await login('admin@lyre.test','admin'), alex: await login('alex@lyre.test'), jordan: await login('jordan@lyre.test') };
async function api(who, path, method = 'GET', body) {
 const r = await fetch(`${base}/api/users${path}`, { method, headers: { Cookie: cookies[who], 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
 return { status: r.status, data: await r.json() };
}
const client = await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
const db = client.db();
const admin = await db.collection('users').findOne({email:'admin@lyre.test'});
const alex = await db.collection('users').findOne({email:'alex@lyre.test'});
const jordan = await db.collection('users').findOne({email:'jordan@lyre.test'});
const pair = JSON.stringify([alex.authUserId,jordan.authUserId].sort());
const sockets = [];
function connect(cookie) { return new Promise((resolve,reject) => { const s = io(base, { extraHeaders: cookie ? { Cookie: cookie } : {}, reconnection:false }); sockets.push(s); s.on('connect',()=>resolve(s)); s.on('connect_error',reject); }); }
try {
 assert.equal((await api('admin',`/messages/${jordan.authUserId}`)).status,403);
 const friends = (await api('admin','')).data;
 assert(friends.some(u => u.authUserId === alex.authUserId)); assert(!friends.some(u=>u.authUserId===jordan.authUserId)); assert(!('email' in friends[0]));
 assert.equal((await api('admin',`/requests/${admin.authUserId}`,'POST')).status,400);
 assert.equal((await api('admin','/search?q=%5B')).status,200);
 const r = await api('jordan',`/requests/${alex.authUserId}`,'POST'); assert.equal(r.status,200);
 assert.equal((await api('admin',`/requests/${r.data._id}`,'PATCH',{action:'accept'})).status,404);
 assert.equal((await api('alex',`/requests/${r.data._id}`,'PATCH',{action:'decline'})).status,200);
 const second = await api('jordan',`/requests/${alex.authUserId}`,'POST');
 assert.equal((await api('alex',`/requests/${second.data._id}`,'PATCH',{action:'accept'})).status,200);
 assert.equal((await api('jordan',`/messages/${alex.authUserId}`)).status,200);
 await assert.rejects(connect(), /Unauthorized/);
 const a = await connect(cookies.admin), b = await connect(cookies.alex);
 await db.collection('friendships').deleteOne({ pair });
 const outsider = await connect(cookies.jordan);
 let leaked = false;
 outsider.on('activity_updated', () => { leaked = true; });
 const update = new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(Error('Activity delivery timed out')),3000); a.once('activity_updated',data=>{clearTimeout(timer);resolve(data);}); });
 b.emit('update_activity',{userId:jordan.authUserId,activity:'Playing: Test - Alex'});
 const activity = await update; assert.equal(activity.userId,alex.authUserId);
 await new Promise(resolve=>setTimeout(resolve,100)); assert.equal(leaked,false);
 const content = `Friend integration test ${Date.now()}`;
 const received = new Promise((resolve,reject)=> { const timer=setTimeout(()=>reject(Error('Message delivery timed out')),3000); b.once('receive_message',m=>{clearTimeout(timer);resolve(m);}); });
 const ack = await new Promise(resolve=>a.emit('send_message',{ senderId:jordan.authUserId,receiverId:alex.authUserId,content },resolve)); assert(ack.success);
 const message = await received; assert.equal(message.senderId,admin.authUserId); assert.equal(message.content,content);
 await db.collection('messages').deleteOne({_id: new (require('mongodb').ObjectId)(message._id)});
 const denied = await new Promise(resolve=>a.emit('send_message',{ receiverId:jordan.authUserId,content:'not allowed' },resolve)); assert(denied.error);
 const blank = await new Promise(resolve=>a.emit('send_message',{ receiverId:alex.authUserId,content:'  ' },resolve)); assert(blank.error);
 console.log('PASS: friend filtering, private history, request permissions, decline/resend/accept, anonymous socket rejection, authenticated sender, realtime delivery, nonfriend/empty message rejection, friend-only activity.');
} finally { sockets.forEach(s=>s.disconnect()); await db.collection('friendships').deleteOne({pair}); await client.close(); }
