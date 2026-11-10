import type { Project, Version } from '@/pages/studio/project';
import { media } from '@/pages/studio/project';
import type { Song } from '@/types';
export const stageLabel = (stage: string) => ({ idea: 'Writing', demo: 'Demo', 'in-progress': 'In progress', released: 'Released' }[stage] || stage);
export function projectSong(project: Project, version?: Version, share?: string | null): Song | null {
  const v = version || project.versions.at(-1);
  if (!v) return null;
  return { _id: `project:${project._id}:${v._id}`, projectId: project._id, versionId: v._id, versionLabel: v.label,
    title: project.title, artist: project.artist, artists: [project.artist], imageUrl: media(project.coverUrl, share), audioUrl: media(v.audioUrl, share), duration: v.duration,
    albumId: null, createdAt: v.createdAt, updatedAt: project.updatedAt };
}
export function relativeTime(value: string) {
 const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
 if (seconds < 60) return 'Just now'; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
 return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
export type ProjectEvent = { id: string; project: Project; kind: 'version' | 'post' | 'comment'; date: string; body: string; image?: string; version?: Version; author: string; timestamp?: number };
export function projectEvents(projects: Project[]): ProjectEvent[] {
 return projects.flatMap(p => [
   ...p.versions.map(v => ({ id: `${p._id}:${v._id}`, project: p, kind: 'version' as const, date: v.createdAt, body: v.note, version: v, author: p.artist })),
   ...(p.posts || []).map(post => ({ id: `${p._id}:${post._id}`, project: p, kind: 'post' as const, date: post.createdAt, body: post.body, image: post.imageUrl, author: p.artist })),
   ...(p.comments || []).map(c => ({ id: `${p._id}:${c._id}`, project: p, kind: 'comment' as const, date: c.createdAt, body: c.body, version: p.versions.find(v => v._id === c.versionId), author: c.authorName, timestamp: c.timestamp })),
 ]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
