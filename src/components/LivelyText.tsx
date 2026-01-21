import { motion } from 'framer-motion';

interface LivelyTextProps {
    text: string;
    className?: string;
}

export function LivelyText({ text, className = "" }: LivelyTextProps) {
    return (
        <span className={`inline-flex ${className}`} style={{ cursor: 'default', whiteSpace: 'nowrap' }}>
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    initial={{
                        filter: "blur(0px)",
                        opacity: 1,
                        y: 0
                    }}
                    whileHover={{
                        filter: ["blur(0px)", "blur(4px)", "blur(0px)"], // Quick blur flash
                        scale: [1, 1.2, 1], // Pulse scale
                        y: -5, // Lift slightly
                        textShadow: "0 0 20px rgb(6, 182, 212), 0 0 40px rgb(6, 182, 212)" // Intense glow
                    }}
                    transition={{
                        duration: 0.4,
                        type: "spring",
                        stiffness: 300,
                        damping: 10
                    }}
                    style={{
                        display: "inline-block",
                        textShadow: "none", // Ensure sharp text by default
                        minWidth: char === " " ? "0.3em" : "auto"
                    }}
                >
                    {char === " " ? "\u00A0" : char}
                </motion.span>
            ))}
        </span>
    );
}
