import { useState, useRef } from 'react';

interface ScrambleTextProps {
    text: string;
    className?: string;
    scrambleSpeed?: number;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";

export function ScrambleText({
    text,
    className = "",
    scrambleSpeed = 30,
}: ScrambleTextProps) {
    const [displayText, setDisplayText] = useState(text);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startScramble = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        let iteration = 0;

        intervalRef.current = setInterval(() => {
            setDisplayText(() =>
                text
                    .split("")
                    .map((_, index) => {
                        if (index < iteration) {
                            return text[index];
                        }
                        return CHARS[Math.floor(Math.random() * CHARS.length)];
                    })
                    .join("")
            );

            if (iteration >= text.length) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setDisplayText(text); // Ensure cleanly finished
            }

            iteration += 1 / 3;
        }, scrambleSpeed);
    };

    return (
        <span
            className={`inline-block font-mono cursor-pointer ${className}`}
            onMouseEnter={startScramble}
            style={{
                minWidth: `${text.length}ch`,
                verticalAlign: 'bottom',
                whiteSpace: 'pre'
            }}
        >
            {displayText}
        </span>
    );
}
