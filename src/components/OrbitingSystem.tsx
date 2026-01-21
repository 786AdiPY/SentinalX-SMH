import { Cpu, Wifi, Radio, Zap, Navigation, Activity } from 'lucide-react';
import './OrbitingSystem.css';

export function OrbitingSystem() {
    return (
        <div className="orbit-system-container">
            {/* Central Nucleus */}
            <div className="nucleus-glow"></div>
            <div className="nucleus">
                <Cpu size={40} className="nucleus-icon" />
            </div>

            {/* Orbit Rings */}
            <div className="orbit-ring ring-1"></div>
            <div className="orbit-ring ring-2"></div>
            <div className="orbit-ring ring-3"></div>

            {/* Orbiting Elements */}
            <div className="orbiter-container orbit-1">
                <div className="orbiter-item">
                    <Wifi size={20} />
                </div>
            </div>

            <div className="orbiter-container orbit-2 reverse">
                <div className="orbiter-item">
                    <Radio size={20} />
                </div>
                <div className="orbiter-item delay-half">
                    <Navigation size={20} />
                </div>
            </div>

            <div className="orbiter-container orbit-3">
                <div className="orbiter-item">
                    <Zap size={20} />
                </div>
                <div className="orbiter-item delay-third">
                    <Activity size={20} />
                </div>
            </div>
        </div>
    );
}
