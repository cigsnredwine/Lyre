import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ImagePlus } from 'lucide-react';
import Artwork from '@/components/redesign/Artwork';
import { media, type Project } from './project';

export default function ProjectSettingsForm({ project, busy, onSave }: {
    project: Project;
    busy: boolean;
    onSave: (form: FormData) => Promise<void>;
}) {
    const [selection, setSelection] = useState<{ file: File; preview: string } | null>(null);
    const [removeCover, setRemoveCover] = useState(false);
    const input = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!selection) return;
        return () => URL.revokeObjectURL(selection.preview);
    }, [selection]);

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        if (selection) form.set('cover', selection.file);
        if (removeCover) form.set('removeCover', 'true');
        void onSave(form);
    }

    const coverPreview = selection?.preview ?? (removeCover ? undefined : media(project.coverUrl));

    return (
        <form className="studio-form" onSubmit={submit}>
            <div className="r-cover-editor">
                <Artwork key={coverPreview} src={coverPreview} alt="Project cover preview" />
                <div>
                    <label className="r-button r-cover-picker">
                        <ImagePlus size={15} />{project.coverUrl ? 'Change cover' : 'Add cover'}
                        <input ref={input} type="file" aria-label="Cover image" accept=".jpg,.jpeg,.png,.webp" disabled={busy} onChange={event => {
                            const selected = event.target.files?.[0];
                            if (selected) {
                                setSelection({ file: selected, preview: URL.createObjectURL(selected) });
                                setRemoveCover(false);
                            }
                        }} />
                    </label>
                    {(selection || (project.coverUrl && !removeCover)) && <button type="button" className="text-link" disabled={busy} onClick={() => {
                        if (input.current) input.current.value = '';
                        if (selection) setSelection(null);
                        else setRemoveCover(true);
                    }}>{selection ? 'Cancel replacement' : 'Remove cover'}</button>}
                    {removeCover && <button type="button" className="text-link" disabled={busy} onClick={() => setRemoveCover(false)}>Keep current cover</button>}
                    <small>JPEG, PNG, or WebP · up to 8 MB</small>
                </div>
            </div>
            <label>Project title<input name="title" defaultValue={project.title} required maxLength={120} /></label>
            <label>Artist name<input name="artist" defaultValue={project.artist} required maxLength={120} /></label>
            <label>Description<textarea name="description" defaultValue={project.description} maxLength={3000} /></label>
            <label>Stage<select name="stage" defaultValue={project.stage}>
                <option value="idea">Idea</option>
                <option value="demo">Demo</option>
                <option value="in-progress">In progress</option>
                <option value="released">Released</option>
            </select></label>
            <button className="s-button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}<Check size={15} /></button>
        </form>
    );
}
