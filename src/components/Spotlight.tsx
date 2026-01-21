import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import './Spotlight.css';

export function Spotlight() {
    const [isActive, setIsActive] = useState(false);

    // Use Framer Motion values for performance (avoids React re-renders)
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth spring animation for the light
    const springConfig = { damping: 25, stiffness: 300, mass: 0.5 };
    const springX = useSpring(x, springConfig);
    const springY = useSpring(y, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            x.set(e.clientX);
            y.set(e.clientY);
            if (!isActive) setIsActive(true);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isActive, x, y]);

    return (
        <motion.div
            className="spotlight-overlay"
            style={{
                background: `radial-gradient(600px circle at ${springX.get()}px ${springY.get()}px, rgba(29, 78, 216, 0.15), transparent 80%)`,
                opacity: isActive ? 1 : 0,
            }}
        />
    );
}

// Separate component for Card spotlight effect using CSS variables
export function CardSpotlightEffect() {
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const cards = document.getElementsByClassName('spotlight-card');
            for (const card of cards) {
                const rect = (card as HTMLElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                (card as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
                (card as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return null;
}
