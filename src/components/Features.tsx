import { Map, Zap, Activity, ShieldCheck, Cpu, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import './Features.css';

const features = [
    {
        icon: <Map className="text-accent" size={32} />,
        title: "SLAM Navigation",
        description: "Real-time Simultaneous Localization and Mapping allowing AGVs to navigate dynamic environments.",
        detail: "Utilizes advanced LIDAR sensor fusion to create high-fidelity maps in real-time. Our SLAM engine handles dynamic obstacle updating at 60Hz, ensuring the AGV always knows its precise location within millimeters, even in changing factory layouts."
    },
    {
        icon: <ShieldCheck className="text-accent" size={32} />,
        title: "Collision Avoidance",
        description: "Advanced algorithms to detect obstacles and other AGVs, preventing accidents seamlessly.",
        detail: "Implements a multi-layered safety system. The primary layer uses occupancy grids for path planning, while a secondary reflex layer halts motion instantly upon detecting sudden intrusions, ensuring ISO 3691-4 safety compliance."
    },
    {
        icon: <Activity className="text-accent" size={32} />,
        title: "Live Telemetry",
        description: "Monitor battery, speed, position, and status of every unit in the fleet with ms-level latency.",
        detail: "Streams over 50 data points per second via WebSockets. Operators can drill down into individual motor currents, battery cell voltages, and CPU temperatures to predict maintenance needs before failures occur."
    },
    {
        icon: <Cpu className="text-accent" size={32} />,
        title: "Fleet Coordination",
        description: "Centralized logic for task allocation and traffic management across multiple robots.",
        detail: "A centralized auction-based task allocator assigns jobs to the optimal free AGV. The traffic manager uses time-window reservation logic to prevent deadlocks at intersections and narrow corridors."
    },
    {
        icon: <LayoutDashboard className="text-accent" size={32} />,
        title: "Intuitive Dashboard",
        description: "User-friendly interface for manual overrides, zone configuration, and system monitoring.",
        detail: "Built with React and Framer Motion, the dashboard allows drag-and-drop zone configuration. Operators can define speed-limit zones, keep-out areas, and patrol routes visually without writing a single line of code."
    },
    {
        icon: <Zap className="text-accent" size={32} />,
        title: "High Performance",
        description: "Built with React 19 and Canvas API for rendering complex maps at 60fps.",
        detail: "Leverages the HTML5 Canvas API and WebGL for map rendering, ensuring smooth performance even with thousands of map points. The frontend state is optimized to handle high-frequency updates without UI lag."
    }
];

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TiltCard } from './TiltCard';

/* ... features array ... */

export function Features() {
    const [selectedFeature, setSelectedFeature] = useState<typeof features[0] | null>(null);

    return (
        <section id="features" className="section features-section">
            <div className="container">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 className="section-title">Core Capabilities</h2>
                    <p className="section-subtitle">Designed for efficiency, safety, and scale.</p>
                </motion.div>

                <div className="grid features-grid">
                    {features.map((feature, index) => (
                        <TiltCard
                            layoutId={`card-${feature.title}`}
                            key={index}
                            className="feature-card spotlight-card"
                            onClick={() => setSelectedFeature(feature)}
                        >
                            <motion.div layoutId={`icon-${feature.title}`} className="feature-icon-wrapper">
                                {feature.icon}
                            </motion.div>
                            <motion.h3 layoutId={`title-${feature.title}`} className="feature-title">{feature.title}</motion.h3>
                            <motion.p layoutId={`desc-${feature.title}`} className="feature-description">{feature.description}</motion.p>
                        </TiltCard>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {selectedFeature && (
                    <div className="modal-backdrop" onClick={() => setSelectedFeature(null)}>
                        <motion.div
                            layoutId={`card-${selectedFeature.title}`}
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="modal-header">
                                <button className="modal-close-btn" onClick={() => setSelectedFeature(null)}>
                                    <X size={20} />
                                </button>
                                <motion.div layoutId={`icon-${selectedFeature.title}`} className="feature-icon-wrapper" style={{ background: 'var(--accent-primary)', marginBottom: '1rem' }}>
                                    {selectedFeature.icon}
                                </motion.div>
                                <motion.h3 layoutId={`title-${selectedFeature.title}`} className="feature-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                    {selectedFeature.title}
                                </motion.h3>
                                <motion.p layoutId={`desc-${selectedFeature.title}`} className="feature-description" style={{ fontSize: '1.1rem' }}>
                                    {selectedFeature.description}
                                </motion.p>
                            </div>
                            <motion.div
                                className="modal-body"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h4 style={{ marginBottom: '1rem', color: 'var(--accent-primary)', fontWeight: 600 }}>TECHNICAL BREAKDOWN</h4>
                                <p style={{ lineHeight: 1.8, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                                    {selectedFeature.detail}
                                </p>
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}
