import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { Skeleton } from '@heroui/react';
import { api } from '../../../../packages/backend/convex/_generated/api';

export function CampaignImage({ r2Key, url, name, aspect = 'video' }: { r2Key?: string; url?: string; name: string; aspect?: 'video' | 'square' }) {
    const accessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const [signed, setSigned] = useState<{ key: string; url: string } | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<string | null>(null);
    const [accessFailed, setAccessFailed] = useState<string | null>(null);
    useEffect(() => {
        if (!r2Key) return;
        let active = true;
        accessUrl({ r2Key }).then(result => {
            if (active) setSigned({ key: r2Key, url: result });
        }).catch(() => { if (active) setAccessFailed(r2Key); });
        return () => { active = false; };
    }, [accessUrl, r2Key]);
    const src = signed?.key === r2Key ? signed?.url : url;
    const imageFailed = Boolean(src && failed === src);
    const isLoading = !imageFailed && (src ? loaded !== src : Boolean(r2Key && accessFailed !== r2Key));
    return (
        <div className={`relative ${aspect === 'square' ? 'aspect-square' : 'aspect-video'} overflow-hidden rounded-xl bg-gray-100`}>
            {isLoading && <Skeleton aria-hidden="true" className="absolute inset-0 h-full w-full rounded-xl" />}
            {src && !imageFailed && <img src={src} alt={name} className={`h-full w-full object-cover transition-opacity ${loaded === src ? 'opacity-100' : 'opacity-0'}`} onLoad={() => setLoaded(src)} onError={() => setFailed(src)} />}
        </div>
    );
}
