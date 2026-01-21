import { motion } from 'framer-motion';
import './Gallery.css';

const screens = [
    {
        title: 'Live Map View',
        type: 'map',
        desc: 'Real-time positions of all AGVs with LIDAR point clouds.'
    },
    {
        title: 'Analytics Dashboard',
        type: 'analytics',
        desc: 'Historical performance data, battery usage trends, and error logs.'
    },
    {
        title: 'Zone Configuration',
        type: 'config',
        desc: 'Drag-and-drop interface to define keep-out zones and patrol routes.'
    }
];

export function Gallery() {
    return (
        <section id="gallery" className="section gallery-section">
            <div className="container">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <h2 className="section-title">Interface Gallery</h2>
                    <p className="section-subtitle">A glimpse into the control system.</p>
                </motion.div>

                <div className="gallery-layout">
                    {screens.map((screen, index) => (
                        <motion.div
                            key={index}
                            className="gallery-item"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <div className={`mockup-window ${screen.type} spotlight-card`}>
                                <div className="window-header">
                                    <div className="dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <div className="window-title">{screen.title}</div>
                                </div>
                                <div className="window-content">
                                    {screen.type === 'map' && (
                                        <div className="mock-map">
                                            <div className="mock-agv a1"></div>
                                            <div className="mock-agv a2"></div>
                                            <div className="mock-wall w1"></div>
                                            <div className="mock-wall w2"></div>
                                        </div>
                                    )}
                                    {screen.type === 'analytics' && (
                                        <div className="mock-charts">
                                            <div className="bar b1"></div>
                                            <div className="bar b2"></div>
                                            <div className="bar b3"></div>
                                            <div className="line-chart"></div>
                                        </div>
                                    )}
                                    {screen.type === 'config' && (
                                        <div className="mock-config">
                                            <div className="zones">
                                                <div className="zone z1"></div>
                                                <div className="zone z2"></div>
                                            </div>
                                            <div className="controls">
                                                <div className="switch"></div>
                                                <div className="switch on"></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="gallery-info">
                                <h3>{screen.title}</h3>
                                <p>{screen.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
