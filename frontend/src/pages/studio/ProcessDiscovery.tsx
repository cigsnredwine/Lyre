import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '@/lib/axios';
import { type Project, media } from './project';
import './studio.css';
export default function ProcessDiscovery() {
    const [projects, setProjects] = useState<Project[]>([]);
    useEffect(() => { axiosInstance.get('/projects').then(r => setProjects(r.data.slice(0, 3))).catch(() => { }); }, []);
    return <><section className='studio-entry-banner'><div><span>ARTIST STUDIO</span><h2>Work on your next release.</h2><p>Upload demos, document changes, and get feedback on each version.</p></div><Link to='/studio'>Open studio ↗</Link></section>{projects.length > 0 && <section className='studio-section-home'><div><h2>Inside the process</h2><Link to='/studio'>Explore projects ↗</Link></div><div className='home-process-grid'>{projects.map(p => <Link key={p._id} to={`/projects/${p._id}`} className='home-process-card'>{p.coverUrl && <img src={media(p.coverUrl)} alt=''/>}<span>{p.stage.replace('-', ' ')}</span><h3>{p.title}</h3><p>{p.artist} · {p.versions.length} versions</p></Link>)}</div></section>}</>;
}
