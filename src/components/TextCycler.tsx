import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextCyclerProps {
    words: string[];
    interval?: number;
    className?: string;
}

export function TextCycler({ words, interval = 200, className = "" }: TextCyclerProps) {
    const [index, setIndex] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (!isHovered) {
            setIndex(0);
            return;
        }

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % words.length);
        }, interval);
        return () => clearInterval(timer);
    }, [isHovered, words, interval]);

    return (
        <div
            className={`inline-block relative h-[1.2em] overflow-hidden ${className}`}
            style={{
                verticalAlign: 'bottom',
                width: 'fit-content',
                display: 'inline-flex',
                cursor: 'pointer'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <AnimatePresence mode='wait'>
                <motion.span
                    key={index}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }} // Faster transition for hover effect
                    style={{
                        display: 'inline-block',
                        textShadow: '0 0 20px rgba(6, 182, 212, 0.6), 0 0 40px rgba(6, 182, 212, 0.3)' // Glow effect
                    }}
                    className="gradient-text"
                >
                    {words[index]}
                </motion.span>
            </AnimatePresence>
        </div>
    );
}
