import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real player component with a media element whose play() requires
// a user gesture, as mobile Safari does. No browser autoplay override is used.
let gesture = false;
let calls = 0;
let rejectPlay;
const audio = {
  src: '', volume: 1,
  getAttribute() { return this.src; },
  pause() {},
  play() {
    calls++;
    if (!gesture) return Promise.reject(Object.assign(Error('blocked'), { name: 'NotAllowedError' }));
    return new Promise((resolve, reject) => { rejectPlay = reject; });
  },
};
let state = { currentSong: null, isPlaying: false };
const listeners = new Set();
const store = Object.assign(() => {}, {
  getState: () => state,
  setState(update) {
    const previous = state;
    state = { ...state, ...update };
    for (const listener of listeners) listener(state, previous);
  },
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
});
const effects = [];
const messages = [];
const modules = {
  '@/stores/usePlayerStore': { usePlayerStore: store },
  '@/stores/useTransportStore': { useTransportStore: Object.assign(fn => fn({ volume: 1 }), { setState() {} }) },
  react: { useRef: () => ({ current: audio }), useEffect: fn => effects.push(fn) },
  'react-hot-toast': { default: { error: message => messages.push(message) } },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
};
const source = await readFile(new URL('../../src/layout/components/AudioPlayer.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exports = {};
vm.runInNewContext(compiled, { exports, require: name => modules[name] });
const element = exports.default();
const cleanup = effects.map(fn => fn());
gesture = true;
store.setState({ currentSong: { audioUrl: '/first.mp3' }, isPlaying: true });
assert.equal(calls, 1, 'play must run before the tap handler returns');
const oldReject = rejectPlay;
store.setState({ currentSong: { audioUrl: '/second.mp3' } });
gesture = false;
oldReject(Object.assign(Error('old request'), { name: 'NotSupportedError' }));
await Promise.resolve();
assert.equal(state.isPlaying, true, 'stale failures must not stop a new track');
element.props.onError();
assert.equal(state.isPlaying, false);
assert.match(messages.at(-1), /could not be loaded/);
store.setState({ isPlaying: true });
await Promise.resolve();
assert.equal(state.isPlaying, false);
assert.match(messages.at(-1), /blocked/);
cleanup.forEach(fn => fn?.());
assert.equal(listeners.size, 0);
console.log('PASS: synchronous gesture playback, track switching, stale failure protection, media errors, blocked playback feedback, cleanup.');
