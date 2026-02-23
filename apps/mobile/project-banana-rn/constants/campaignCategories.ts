import { Swords, Star, Video, MessageSquare, Mic, Scissors, MonitorPlay } from 'lucide-react-native';

export const CAMPAIGN_CATEGORIES = [
    {
        id: 'challenge',
        label: 'Challenge',
        desc: 'Fun tasks or trends that creators do to showcase your brand playfully.',
        icon: Swords,
        examples: [
            { label: 'Ice Bucket Challenge — ALS', url: 'https://www.youtube.com/shorts/QBiGq5p7mMU' },
            { label: 'Pack & Wear Challenge', url: 'https://www.tiktok.com/@zara/video/7218440741672948998' },
        ],
    },
    {
        id: 'product-review',
        label: 'Product Review',
        desc: "Honest and detailed feedback highlighting your product's best features.",
        icon: Star,
        examples: [
            { label: 'Skincare First Impressions', url: 'https://www.youtube.com/shorts/4qoSRMDmFgE' },
            { label: 'Honest Gadget Unboxing', url: 'https://www.youtube.com/shorts/N0E1o_5c3XM' },
        ],
    },
    {
        id: 'vlog',
        label: 'Vlog',
        desc: 'Casual, story-style videos integrating your product into daily life.',
        icon: Video,
        examples: [
            { label: 'Morning Routine with Brand', url: 'https://www.youtube.com/shorts/gWAZ9B3HJUE' },
            { label: 'Day In My Life — Sponsored', url: 'https://www.youtube.com/shorts/cdNLWe5hxBE' },
        ],
    },
    {
        id: 'reaction',
        label: 'Reaction',
        desc: 'Genuine, unfiltered first impressions of creators trying your product.',
        icon: MessageSquare,
        examples: [
            { label: 'Trying Viral Food Product', url: 'https://www.youtube.com/shorts/DLNloxN0EvA' },
            { label: 'First Try Beauty Reaction', url: 'https://www.youtube.com/shorts/V_vO7XRvVV8' },
        ],
    },
    {
        id: 'voiceover',
        label: 'Voiceover',
        desc: 'A narrative spoken over compelling visuals or B-roll of your product.',
        icon: Mic,
        examples: [
            { label: 'Product Story Voiceover', url: 'https://www.youtube.com/shorts/3HkggxR2UWM' },
            { label: 'B-roll with Narration', url: 'https://www.youtube.com/shorts/8vapaGFEhas' },
        ],
    },
    {
        id: 'clipping',
        label: 'Clipping',
        desc: 'Short, viral highlights cut from longer podcasts or stream content.',
        icon: Scissors,
        examples: [
            { label: 'Podcast Clip — Hot Take', url: 'https://www.youtube.com/shorts/kffacxfA7Q4' },
            { label: 'Stream Highlight — Viral Moment', url: 'https://www.youtube.com/shorts/zITJOR7NHOU' },
        ],
    },
    {
        id: 'product-demo',
        label: 'Product Demo',
        desc: 'A clear, step-by-step guide showing exactly how your product works.',
        icon: MonitorPlay,
        examples: [
            { label: 'App Tutorial Walkthrough', url: 'https://www.youtube.com/shorts/Q1pGQmB3eMA' },
            { label: 'Before & After Demo', url: 'https://www.youtube.com/shorts/hbCbJBMCl7I' },
        ],
    },
];
