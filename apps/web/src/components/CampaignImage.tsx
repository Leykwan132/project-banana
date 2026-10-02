import { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../../../packages/backend/convex/_generated/api';

export function CampaignImage({ r2Key, url, name, aspect = 'video' }: { r2Key?: string; url?: string; name: string; aspect?: 'video' | 'square' }) {
    const accessUrl = useAction(api.campaigns.generateCampaignImageAccessUrl);
    const [signed, setSigned] = useState<{ key: string; url: string } | null>(null);
    const [failed, setFailed] = useState<string | null>(null);
    useEffect(() => {
        if (!r2Key) return;
        let active = true;
        accessUrl({ r2Key }).then(result => {
            if (active) setSigned({ key: r2Key, url: result });
        }).catch(() => { /* A missing image does not block browsing. */ });
        return () => { active = false; };
    }, [accessUrl, r2Key]);
    const src = signed?.key === r2Key ? signed?.url : url;
    return (
        <div className={`flex ${aspect === 'square' ? 'aspect-square' : 'aspect-video'} items-center justify-center overflow-hidden rounded-xl bg-gray-100`}>
            {src && failed !== src ? <img src={src} alt={name} className="h-full w-full object-cover" onError={() => setFailed(src)} /> : <span className="text-3xl font-semibold text-gray-500" aria-hidden="true">{name.charAt(0)}</span>}
        </div>
    );
}
