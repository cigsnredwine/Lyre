import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '@/pages/studio/project';

export default function ArtistCredits({ project }: { project: Project }) {
    if (!project.artistCredits?.length) return <>{project.artist}</>;
    return <span className='artist-credits'>{project.artistCredits.map(({ name, accountId }, index) => (
        <Fragment key={`${name}-${index}`}>
            {index > 0 && ', '}
            {accountId ? <Link to={`/profile/${encodeURIComponent(accountId)}`}>{name}</Link> : name}
        </Fragment>
    ))}</span>;
}
