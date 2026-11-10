import { Disc3 } from 'lucide-react';
import { useState } from 'react';
export default function Artwork({ src, alt = '', className = '' }: { src?: string; alt?: string; className?: string }) {
 const [failed, setFailed] = useState(false);
 return src && !failed ? <img className={`r-artwork ${className}`} src={src} alt={alt} loading='lazy' decoding='async' onError={() => setFailed(true)}/> : <div className={`r-artwork r-artwork-empty ${className}`} role='img' aria-label={alt || 'No cover artwork'}><Disc3 strokeWidth={.8}/></div>;
}
