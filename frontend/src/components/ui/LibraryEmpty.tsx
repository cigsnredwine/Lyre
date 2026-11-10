import { Music2 } from 'lucide-react';
export default function LibraryEmpty({ title = 'No songs here yet', description = 'New uploads will appear here.' }: { title?: string; description?: string }) {
  return <div className='library-empty' role='status'><Music2 size={22} strokeWidth={1.4}/><p>{title}</p><span>{description}</span></div>;
}
