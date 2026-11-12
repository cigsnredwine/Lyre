import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { io } from 'socket.io-client';
const require=createRequire(new URL('../../../backend/package.json',import.meta.url));
const {MongoClient,ObjectId}=require('mongodb');
const base='http://localhost:5001/api';
const client=await new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test').connect();
const db=client.db(),sockets=[];
async function login(email,password){const r=await fetch(base+'/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');}
const owner=await login('admin@lyre.test','admin'),friend=await login('alex@lyre.test','LyreTest123!');
const artist=await db.collection('users').findOne({email:'admin@lyre.test'}),listener=await db.collection('users').findOne({email:'alex@lyre.test'});
const filter={followerId:listener.authUserId,artistId:artist.authUserId};
const previous=await db.collection('artistfollows').findOne(filter);
let projectId;
async function api(cookie,path,method='GET',body){const r=await fetch(base+path,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
function connect(cookie){return new Promise((resolve,reject)=>{const s=io('http://localhost:5001',{extraHeaders:{Cookie:cookie},reconnection:false});sockets.push(s);s.once('connect',()=>resolve(s));s.once('connect_error',reject);});}
function event(socket,name){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(name+' timeout')),3000);socket.once(name,value=>{clearTimeout(timer);resolve(value);});});}
try{
 assert.equal((await api('',`/artists/${artist.authUserId}/follow`,'POST',{follow:true})).status,401);
 assert.equal((await api(owner,`/artists/${artist.authUserId}/follow`,'POST',{follow:true})).status,400);
 for(let i=0;i<2;i++)assert.equal((await api(friend,`/artists/${artist.authUserId}/follow`,'POST',{follow:true})).data.isFollowing,true);
 assert.equal(await db.collection('artistfollows').countDocuments(filter),1);
 assert.equal((await api(friend,`/artists/${artist.authUserId}`)).data.isFollowing,true);
 assert((await api(friend,'/artists/following')).data.some(a=>a.id===artist.authUserId));
 projectId=new ObjectId();const versionId=new ObjectId();
 await db.collection('projects').insertOne({_id:projectId,title:'Social test',artist:'Test artist',ownerId:artist.authUserId,visibility:'public',stage:'demo',followers:[],invitedEmails:[],artistCredits:[],versions:[{_id:versionId,label:'Test',duration:10,isPublic:true}],posts:[],comments:[],createdAt:new Date(),updatedAt:new Date()});
 assert((await api(friend,'/projects?scope=following')).data.some(p=>p._id===String(projectId)));
 const a=await connect(owner),b=await connect(friend);
 let next=event(b,'activity_updated');a.emit('update_activity',{activity:'Playing: ignored',projectId:String(projectId),versionId:String(versionId)});
 let update=await next;assert.equal(update.projectId,String(projectId));assert.equal(update.activity,'Playing: Social test - Test artist');
 await db.collection('projects').updateOne({_id:projectId},{$set:{visibility:'private'}});
 assert(!(await api(friend,'/projects?scope=following')).data.some(p=>p._id===String(projectId)));
 next=event(b,'activity_updated');a.emit('update_activity',{activity:'Playing: secret',projectId:String(projectId),versionId:String(versionId)});
 update=await next;assert.equal(update.projectId,null);assert.equal(update.activity,'Idle');
 assert.equal((await api(friend,`/artists/${artist.authUserId}/follow`,'POST',{follow:false})).data.isFollowing,false);
 assert.equal((await api(friend,`/artists/${artist.authUserId}`)).data.isFollowing,false);
 console.log('PASS: authenticated artist follows, self-follow rejection, idempotence, following list/feed, public activity links, private activity suppression, unfollow.');
}finally{
 sockets.forEach(s=>s.disconnect());
 if(projectId)await db.collection('projects').deleteOne({_id:projectId});
 await db.collection('artistfollows').deleteMany(filter);if(previous)await db.collection('artistfollows').insertOne(previous);
 await client.close();
}
