# Local test environment

Open http://localhost:3000/login and sign in with **admin / admin**.
The development username maps to `admin@lyre.test`.

Start Docker Desktop, then run from `frontend`:

```sh
docker start lyre-test-mongo
npm run dev:backend
```

In a second terminal:

```sh
npm run dev -- --host 127.0.0.1
```

For a fresh database container:

```sh
docker run -d --name lyre-test-mongo -p 127.0.0.1:27018:27017 -v lyre-test-mongo-data:/data/db mongo:7
```

The backend runner uses only `mongodb://127.0.0.1:27018/lyre_local_test`,
creates the development account if missing, and stores its authentication secret
in the ignored `runtime.local` directory. It does not load `backend/.env`.
Hosted authentication and Cloudinary credentials are cleared; media uploads
need separately configured development storage.

The frontend `.env.local` uses:

```dotenv
VITE_API_URL=http://localhost:5001/api
VITE_AUTH_URL=http://localhost:5001
VITE_SOCKET_URL=http://localhost:5001
VITE_LOCAL_TEST_AUTH=true
```

The `admin` username alias is enabled only in Vite development mode.
Database contents persist in the `lyre-test-mongo-data` Docker volume.

## Friends and chat test data

Run `node scripts/seed-local-users.mjs` from `frontend` to add local accounts
without resetting existing users or friendships. With `admin / admin`:

- Alex Rivera is already a friend, with a sample chat message.
- Maya Chen has an incoming friend request to accept or decline.
- Sam Taylor has an outgoing request that can be cancelled.
- Jordan Lee is unconnected and can be found using Add friends.

Sign in to `alex@lyre.test`, `maya@lyre.test`, `sam@lyre.test`, or
`jordan@lyre.test` with password `LyreTest123!` in a separate browser profile
to test requests, chat, and listening activity between accounts.
Run `node scripts/test-local-friends.mjs` against the running local backend
for request authorization and realtime message integration checks.

## Artist projects

Open http://localhost:3000/studio. New projects start private. Upload a demo,
add audio versions, publish process notes and images, and invite collaborators
using their login emails. The sharing settings support private, invited,
unlisted, and public projects. Each audio version has its own sharing switch;
unshared versions and their feedback remain with the artist and collaborators.
Only the artist can upload versions or publish process notes. Invited listeners
can leave feedback; timestamps are associated with the selected audio version.
Following a project adds it to the Following tab, sorted by its latest update.
Invitations appear in Collaborations; no external email is sent.

Seed examples with `node scripts/seed-local-projects.mjs`. The seed keeps
existing projects intact. It uses an excerpt generated with:

```sh
ffmpeg -hide_banner -loglevel error -y -i 'public/songs/19 master.wav' -t 38 \
  -af 'lowpass=f=2500,afade=t=out:st=35:d=3' runtime.local/project-storage/seed-first-demo.mp3
```

The local samples include **19** (public), **midsummer** (invited, Alex has
access), and **a little beginning** (private). The artist is the local admin.
Run `node scripts/test-local-projects.mjs` against the running backend for
upload, version, feedback, invitation, media-access, and sharing-link checks.
The test creates and removes only its own temporary project and uploaded files.

Project uploads are stored outside the public frontend assets, in
`runtime.local/project-storage` when using the local backend runner.
For deployment, set `PROJECT_STORAGE_DIR` to a persistent disk location and
back it up alongside MongoDB. Existing library uploads remain available at
`/library-upload`; `/upload-music` now opens the artist studio.

## Bundled studio demos

After starting the local backend, run `node scripts/seed-bundled-demos.mjs`
from `frontend` to add ROLLING, em? / iem, y xi em, DEPOP, and midsummer.
The bundle includes 27 audio versions and four gallery covers. WAV demos in
the bundle are MP3 copies, and midsummer uses the existing library WAV.
The seed creates private projects and skips existing projects with the same
name. It copies the assets into local project storage for playback.

To seed under an existing local account, set `LYRE_SEED_EMAIL` for both
scripts. Create the account in Lyre first, then run from `frontend`:

```sh
LYRE_SEED_EMAIL=you@example.com node scripts/seed-bundled-demos.mjs
LYRE_SEED_EMAIL=you@example.com node scripts/seed-local.mjs
```

The library seed assigns new and unowned seeded songs and albums to that
account. The project seed creates the bundle in that account's studio.
