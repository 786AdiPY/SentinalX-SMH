import { ArrowRight, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import './Hero.css';
import { OrbitingSystem } from './OrbitingSystem';
import { LivelyText } from './LivelyText';

export function Hero() {
    return (
        <section className="hero">
            <div className="container hero-content">
                <motion.div
                    className="hero-text"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="hero-badge">v2.0 Now Available</span>
                    <h1 className="hero-title">
                        Intelligent <LivelyText text="Multi-AGV" className="text-accent" /> Fleet Control
                    </h1>
                    <p className="hero-description">
                        A high-performance dashboard for managing autonomous guided vehicles in real-time.
                        Featuring SLAM navigation, dynamic collision avoidance, and live telemetry.
                    </p>
                    <div className="hero-actions">
                        <Link to="/dashboard" className="btn btn-primary">
                            Launch System <PlayCircle size={20} />
                        </Link>
                        <button className="btn btn-secondary" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                            Explore Features <ArrowRight size={20} />
                        </button>
                    </div>
                </motion.div>

                <motion.div
                    className="hero-visual"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <OrbitingSystem />
                </motion.div>
            </div>
        </section>
    );
}
