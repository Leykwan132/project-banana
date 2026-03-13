import { useEffect, useRef, useState } from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { ThemedText } from '@/components/themed-text';

interface TypingTextProps {
    text: string;
    style?: StyleProp<TextStyle>;
    /** How fast each dot appears, in ms. Default: 500 */
    dotInterval?: number;
}

/**
 * Renders `text` followed by an animated ellipsis that cycles:
 * ""  →  "."  →  ".."  →  "..."  →  ""  →  …
 */
export function TypingText({ text, style, dotInterval = 500 }: TypingTextProps) {
    const [dots, setDots] = useState('');
    const countRef = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            countRef.current = (countRef.current + 1) % 4;
            setDots('.'.repeat(countRef.current));
        }, dotInterval);
        return () => clearInterval(id);
    }, [dotInterval]);

    return (
        <ThemedText style={style}>
            {text}{dots}
        </ThemedText>
    );
}
