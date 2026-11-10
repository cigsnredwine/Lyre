import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixtureDir = new URL('../../../frontend/fixtures/studio-demos/', import.meta.url);
const libraryDir = new URL('../../../frontend/public/', import.meta.url);
export const studioDemos = JSON.parse(readFileSync(new URL('projects.json', fixtureDir), 'utf8'));

const audioFiles = new Map();
const coverFiles = new Map();
for (const project of studioDemos) {
    if (project.cover) coverFiles.set(project.cover, fileURLToPath(new URL(project.cover, fixtureDir)));
    for (const version of project.versions) {
        const name = version.audio || version.libraryAudio;
        audioFiles.set(name, fileURLToPath(new URL(name, version.audio ? fixtureDir : libraryDir)));
    }
}

export function studioDemoAsset(reference, type) {
    if (!reference.startsWith('studio-demo:')) return undefined;
    const files = type === 'audio' ? audioFiles : coverFiles;
    return files.get(reference.slice('studio-demo:'.length)) ?? null;
}
