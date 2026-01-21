import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    Battery,
    Navigation,
    Box,
    Settings,
    Shield,
    Zap,
    Cpu
} from 'lucide-react';
import { SLAMEngine, CellType } from './slam-engine';
import './App.css';

const ENGINE_ROWS = 100;
const ENGINE_COLS = 150;

const ZONES = [
    { id: 'workshop', name: 'Workshop', icon: Settings, rect: { x: 10, y: 10, w: 35, h: 30 }, color: '#f97316' },
    { id: 'materials', name: 'Material Space', icon: Box, rect: { x: 55, y: 10, w: 40, h: 30 }, color: '#22c55e' },
    { id: 'control', name: 'Control Room', icon: Shield, rect: { x: 110, y: 10, w: 30, h: 20 }, color: '#3b82f6' },
    { id: 'station', name: "AGV's Station", icon: Battery, rect: { x: 100, y: 45, w: 40, h: 30 }, color: '#facc15' },
    { id: 'supply', name: 'Supply Area', icon: Navigation, rect: { x: 10, y: 65, w: 50, h: 25 }, color: '#a855f7' },
    { id: 'shipping', name: 'Shipping & EXIT', icon: Zap, rect: { x: 75, y: 65, w: 65, h: 25 }, color: '#ef4444' },
];

function App() {
    const [engine] = useState(new SLAMEngine(ENGINE_ROWS, ENGINE_COLS));
    const [agvStatus, setAgvStatus] = useState({
        state: 'Idle',
        load: 'Normal',
        battery: 100,
        currentZone: 'Unknown'
    });
    const [controlMode, setControlMode] = useState<'Auto' | 'Manual'>('Auto');
    const [navTarget, setNavTarget] = useState<{ x: number, y: number } | null>(null);
    const keysPressed = useRef<Set<string>>(new Set());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (controlMode === 'Manual') keysPressed.current.add(e.key);
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (controlMode === 'Manual') keysPressed.current.delete(e.key);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [controlMode]);

    useEffect(() => {
        const canvas = document.getElementById('slam-map') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let patrolIdx = 0;
        const patrolPath = [
            { x: 27, y: 25 }, { x: 75, y: 25 }, { x: 120, y: 60 }, { x: 35, y: 77 }
        ];

        const render = () => {
            let dx = 0, dy = 0;
            const speed = 0.3;

            if (controlMode === 'Manual') {
                if (keysPressed.current.has('ArrowUp')) dy -= speed;
                if (keysPressed.current.has('ArrowDown')) dy += speed;
                if (keysPressed.current.has('ArrowLeft')) dx -= speed;
                if (keysPressed.current.has('ArrowRight')) dx += speed;
            } else {
                const target = navTarget || patrolPath[patrolIdx];
                const dist = Math.sqrt(Math.pow(target.x - engine.agvPos.x, 2) + Math.pow(target.y - engine.agvPos.y, 2));
                if (dist > 1) {
                    dx = ((target.x - engine.agvPos.x) / dist) * speed;
                    dy = ((target.y - engine.agvPos.y) / dist) * speed;
                } else if (!navTarget) {
                    patrolIdx = (patrolIdx + 1) % patrolPath.length;
                } else {
                    setNavTarget(null);
                }
            }

            const moved = engine.move(dx, dy);
            setAgvStatus(prev => ({
                ...prev,
                state: moved ? 'Moving' : (dx === 0 && dy === 0 ? 'Idle' : 'Blocked'),
                battery: Math.max(0, prev.battery - 0.005),
                currentZone: determineZone(engine.agvPos.x, engine.agvPos.y)
            }));

            const cellSize = Math.floor(Math.min(canvas.width / ENGINE_COLS, canvas.height / ENGINE_ROWS));
            const offsetX = Math.floor((canvas.width - ENGINE_COLS * cellSize) / 2);
            const offsetY = Math.floor((canvas.height - ENGINE_ROWS * cellSize) / 2);

            ctx.fillStyle = '#05070a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            for (let r = 0; r < ENGINE_ROWS; r++) {
                for (let c = 0; c < ENGINE_COLS; c++) {
                    const cell = engine.grid[r][c];
                    if (cell === CellType.FREE) {
                        ctx.fillStyle = '#0a0d12';
                        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
                    } else if (cell === CellType.WALL) {
                        ctx.fillStyle = '#00f2ff';
                        ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize, cellSize);
                    }
                }
            }

            if (navTarget) {
                ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(offsetX + engine.agvPos.x * cellSize, offsetY + engine.agvPos.y * cellSize);
                ctx.lineTo(offsetX + navTarget.x * cellSize, offsetY + navTarget.y * cellSize);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            ctx.fillStyle = '#ff9d00';
            ctx.beginPath();
            ctx.arc(offsetX + engine.agvPos.x * cellSize, offsetY + engine.agvPos.y * cellSize, cellSize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            animationId = requestAnimationFrame(render);
        };

        const handleResize = () => {
            canvas.width = canvas.parentElement?.clientWidth || 800;
            canvas.height = canvas.parentElement?.clientHeight || 600;
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        render();
        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, [engine, controlMode, navTarget]);

    const determineZone = (x: number, y: number) => {
        const zone = ZONES.find(z => x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h);
        return zone ? zone.name : 'Neutral Zone';
    };

    const setTarget = (rect: { x: number, y: number, w: number, h: number }) => {
        setNavTarget({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
        setControlMode('Auto');
    };

    return (
        <div className="dashboard-container">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LayoutDashboard color="var(--accent-primary)" />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>NEURAL-GRID <span style={{ color: 'var(--text-dim)', fontWeight: 300 }}>AGV CONTROL</span></h1>
                </div>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div className={`mode-toggle ${controlMode === 'Auto' ? 'active' : ''}`} onClick={() => setControlMode('Auto')}><Cpu size={16} /> AUTO</div>
                    <div className={`mode-toggle ${controlMode === 'Manual' ? 'active' : ''}`} onClick={() => setControlMode('Manual')}><Zap size={16} /> MANUAL</div>
                </div>
            </header>

            <aside className="panel">
                <div className="title">Factory Zones</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '12px' }}>CLICK TO NAVIGATE</div>
                {ZONES.map(zone => (
                    <div key={zone.id} className={`card zone-card ${agvStatus.currentZone === zone.name ? 'active' : ''}`} onClick={() => setTarget(zone.rect)} style={{ borderLeftColor: zone.color }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <zone.icon size={18} color={agvStatus.currentZone === zone.name ? zone.color : 'var(--text-dim)'} />
                            <span style={{ color: agvStatus.currentZone === zone.name ? zone.color : 'inherit' }}>{zone.name}</span>
                        </div>
                    </div>
                ))}
            </aside>

            <main className="panel center-panel">
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                    <div className="title" style={{ marginBottom: '8px' }}>Real-Time SLAM Map</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>MODE: {controlMode.toUpperCase()}</div>
                </div>
                <canvas id="slam-map" style={{ width: '100%', height: '100%' }}></canvas>
            </main>

            <aside className="panel">
                <div className="title">AGV-01 Telemetry</div>
                <div className="card">
                    <div className="title" style={{ fontSize: '0.7rem' }}>Status</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{agvStatus.state}</span>
                        <span className="status-indicator" style={{ backgroundColor: agvStatus.state === 'Moving' ? 'var(--status-moving)' : 'var(--status-idle)' }}></span>
                    </div>
                </div>
                <div className="card">
                    <div className="title" style={{ fontSize: '0.7rem' }}>Battery</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600 }}>{Math.round(agvStatus.battery)}%</span>
                        <Battery size={18} color={agvStatus.battery > 20 ? 'var(--status-moving)' : 'var(--status-alert)'} />
                    </div>
                    <div style={{ width: '100%', height: '4px', background: '#333', borderRadius: '2px', marginTop: '8px' }}>
                        <div style={{ width: `${agvStatus.battery}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '2px' }}></div>
                    </div>
                </div>
                <div className="card">
                    <div className="title" style={{ fontSize: '0.7rem' }}>Current Zone</div>
                    <span style={{ fontWeight: 600 }}>{agvStatus.currentZone}</span>
                </div>
            </aside>
        </div>
    );
}

export default App;
