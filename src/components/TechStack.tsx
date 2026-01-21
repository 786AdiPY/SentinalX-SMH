import { motion } from 'framer-motion';
import './TechStack.css';

const techs = [
    { name: 'React 19', category: 'Frontend' },
    { name: 'TypeScript', category: 'Language' },
    { name: 'Vite', category: 'Build Tool' },
    { name: 'Canvas API', category: 'Graphics' },
    { name: 'WebSockets', category: 'Networking' },
    { name: 'Node.js', category: 'Backend Runtime' }
];

export function TechStack() {
    return (
        <section id="tech-stack" className="section tech-stack-section">
            <div className="container">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                >
                    <h2 className="section-title">Built With Modern Tech</h2>
                </motion.div>

                <div className="tech-grid">
                    {techs.map((tech, index) => (
                        <motion.div
                            key={index}
                            className="tech-item spotlight-card"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <span className="tech-name">{tech.name}</span>
                            <span className="tech-category">{tech.category}</span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
