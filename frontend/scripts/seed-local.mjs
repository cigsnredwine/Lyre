import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { MongoClient } = require('mongodb');
const source = readFileSync(new URL('../../backend/src/seeds/albums.js', import.meta.url), 'utf8');
const songs = vm.runInNewContext(source.match(/Song\.insertMany\((\[[\s\S]*?\])\);/)[1]).slice(0, 9);
for (const [title, artist, file, duration] of [
  ['Tek It', 'Cafuné', 'Tek It_spotdown.org.mp3', 191],
  ['Heavy', 'The Marías', 'Heavy_spotdown.org.mp3', 253],
  ["It's Me & You", 'Tokyo Tea Room', "It's Me & You_spotdown.org.mp3", 218],
]) songs.push({ title, artist, audioUrl: `/songs/${file}`, duration, imageUrl: songs[0].imageUrl });
for (const song of songs) for (const key of ['audioUrl', 'imageUrl']) {
  if (!existsSync(new URL(`../public${song[key]}`, import.meta.url))) throw Error(`Missing ${song[key]}`);
}
const client = new MongoClient('mongodb://127.0.0.1:27018/lyre_local_test');
await client.connect();
try {
  const db = client.db();
  const email = process.env.LYRE_SEED_EMAIL?.trim().toLowerCase();
  const user = email ? await db.collection('user').findOne({ email }) : null;
  if (email && !user) throw new Error(`Create the local Lyre account ${email} before importing the library.`);
  const ownerId = user ? String(user.id || user._id) : null;
  const ids = [];
  const albumIds = [];
  for (const { plays, ...song } of songs) {
    const saved = await db.collection('songs').findOneAndUpdate(
      { title: song.title, artist: song.artist, audioUrl: song.audioUrl },
      { $set: { ...song, artists: song.artist.split(',').map(s => s.trim()), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), uploadedByUserId: ownerId } },
      { upsert: true, returnDocument: 'after' });
    ids.push(saved._id);
  }
  const albums = [
    { title: 'khi nào em tiện', artist: 'hien long', imageUrl: '/albums/khi nao em tien temp cover.jpg', releaseYear: 2026, songs: ids.slice(0, 9) },
    { title: 'Coastal Dreaming', artist: 'Various Artists', imageUrl: '/albums/2.jpg', releaseYear: 2024, songs: ids.slice(9) },
  ];
  for (const album of albums) {
    const saved = await db.collection('albums').findOneAndUpdate(
      { title: album.title, artist: album.artist },
      { $set: { ...album, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date(), uploadedByUserId: ownerId } },
      { upsert: true, returnDocument: 'after' });
    albumIds.push(saved._id);
    await db.collection('songs').updateMany({ _id: { $in: album.songs } }, { $set: { albumId: saved._id } });
    const count = await db.collection('songs').countDocuments({ _id: { $in: album.songs }, albumId: saved._id });
    if (count !== album.songs.length) throw Error('Album link verification failed');
    console.log(`${album.title}: ${count} tracks verified`);
  }
  if (ownerId) {
    await db.collection('songs').updateMany({ _id: { $in: ids }, uploadedByUserId: null }, { $set: { uploadedByUserId: ownerId } });
    await db.collection('albums').updateMany({ _id: { $in: albumIds }, uploadedByUserId: null }, { $set: { uploadedByUserId: ownerId } });
  }
  console.log(`Seeded ${songs.length} songs and ${albums.length} albums in ${db.databaseName}.`);
} finally { await client.close(); }
