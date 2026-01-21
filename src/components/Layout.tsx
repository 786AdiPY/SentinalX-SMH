import React from 'react';
import { Bot, ExternalLink } from 'lucide-react';
import './Layout.css';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="layout">
            <nav className="navbar">
                <div className="container navbar-content">
                    <div className="logo">
                        <Bot className="logo-icon" />
                        <span className="logo-text">NEURAL <span className="text-accent">GRID</span></span>
                    </div>
                    <div className="nav-links">
                        <a href="#features">Features</a>
                        <a href="#tech-stack">Tech Stack</a>
                        <a href="#gallery">Gallery</a>
                        <a href="http://localhost:5174" className="github-link">
                            <ExternalLink size={18} />
                            <span>Launch</span>
                        </a>
                    </div>
                </div>
            </nav>

            <main>
                {children}
            </main>

            <footer className="footer">
                <div className="container footer-content">
                    <p>© 2026 AGV Control Systems. All rights reserved.</p>
                    <div className="footer-links">
                        <a href="#" className="flex items-center gap-1">
                            View Source <ExternalLink size={14} />
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
