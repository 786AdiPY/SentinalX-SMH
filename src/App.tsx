import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Navigation,
    Box,
    Settings,
    Shield,
    Zap,
    Truck,
    Activity
} from 'lucide-react';
import { SLAMEngine, CellType } from './slam-engine';
import AGVStation from './pages/AGVStation';
import './App.css';

const ENGINE_ROWS = 100;
const ENGINE_COLS = 150;

// Factory zones displayed in sidebar
const ZONES = [
    { id: 'workshop', name: 'Workshop', icon: Settings, rect: { x: 10, y: 10, w: 35, h: 30 }, color: '#f97316' },
    { id: 'materials', name: 'Material Space', icon: Box, rect: { x: 55, y: 10, w: 40, h: 30 }, color: '#22c55e' },
    { id: 'control', name: 'Control Room', icon: Shield, rect: { x: 110, y: 10, w: 30, h: 20 }, color: '#3b82f6' },
    { id: 'supply', name: 'Supply Area', icon: Navigation, rect: { x: 10, y: 70, w: 35, h: 22 }, color: '#a855f7' },
    { id: 'shipping', name: 'Shipping & EXIT', icon: Zap, rect: { x: 55, y: 70, w: 40, h: 22 }, color: '#ef4444' },
];

// Red path segments that the AGV follows
const AGV_PATH_SEGMENTS = [
    [{ x: 5, y: 5 }, { x: 5, y: 94 }],     // Left vertical
    [{ x: 5, y: 5 }, { x: 144, y: 5 }],    // Top horizontal
    [{ x: 144, y: 5 }, { x: 144, y: 94 }], // Right vertical  
    [{ x: 5, y: 94 }, { x: 144, y: 94 }],  // Bottom horizontal
    [{ x: 5, y: 42 }, { x: 52, y: 42 }],   // Left section
    [{ x: 52, y: 42 }, { x: 52, y: 5 }],   // Up to top
    [{ x: 50, y: 42 }, { x: 97, y: 42 }],  // Across middle
    [{ x: 97, y: 42 }, { x: 97, y: 5 }],   // Up to top corridor
    [{ x: 97, y: 5 }, { x: 107, y: 5 }],   // Across to control room area
    [{ x: 107, y: 5 }, { x: 107, y: 37 }], // Down to AGV station
    [{ x: 107, y: 37 }, { x: 144, y: 37 }],// Across to right side
    [{ x: 5, y: 67 }, { x: 52, y: 67 }],   // Above bottom zones
    [{ x: 52, y: 67 }, { x: 52, y: 94 }],  // Down between zones
    [{ x: 52, y: 42 }, { x: 52, y: 67 }],  // Vertical connector
    [{ x: 97, y: 67 }, { x: 97, y: 94 }],  // Vertical on right of shipping
    [{ x: 97, y: 67 }, { x: 144, y: 67 }], // Horizontal to AGV station area
    [{ x: 27, y: 39 }, { x: 27, y: 42 }],
    [{ x: 75, y: 39 }, { x: 75, y: 42 }],
    [{ x: 125, y: 29 }, { x: 125, y: 37 }],
    [{ x: 97, y: 52 }, { x: 100, y: 52 }],
    [{ x: 27, y: 67 }, { x: 27, y: 70 }],
    [{ x: 75, y: 67 }, { x: 75, y: 70 }],
    [{ x: 27, y: 42 }, { x: 52, y: 42 }],
    [{ x: 75, y: 42 }, { x: 97, y: 42 }],
    [{ x: 125, y: 37 }, { x: 144, y: 37 }],
    [{ x: 97, y: 52 }, { x: 97, y: 67 }],
    [{ x: 27, y: 67 }, { x: 52, y: 67 }],
    [{ x: 75, y: 67 }, { x: 97, y: 67 }],
];

const AGV_ROUTES = {
    AGV1: [{ x: 5, y: 5 }, { x: 144, y: 5 }, { x: 144, y: 94 }, { x: 5, y: 94 }],
    AGV2: [
        { x: 5, y: 42 }, { x: 52, y: 42 }, { x: 52, y: 5 }, { x: 97, y: 5 },
        { x: 107, y: 5 }, { x: 107, y: 37 }, { x: 144, y: 37 }, { x: 144, y: 67 },
        { x: 97, y: 67 }, { x: 97, y: 42 }, { x: 50, y: 42 }
    ],
    AGV3: [
        { x: 5, y: 67 }, { x: 52, y: 67 }, { x: 52, y: 94 }, { x: 97, y: 94 },
        { x: 97, y: 67 }, { x: 52, y: 67 }, { x: 52, y: 42 }, { x: 5, y: 42 }
    ]
};

const AGV_FLEET_CONFIG = [
    { id: 'AGV-01', route: AGV_ROUTES.AGV1, color: '#ff9d00' },
    { id: 'AGV-02', route: AGV_ROUTES.AGV2, color: '#00f2ff' },
    { id: 'AGV-03', route: AGV_ROUTES.AGV3, color: '#22c55e' },
];

function Dashboard() {
    const [engine] = useState(new SLAMEngine(ENGINE_ROWS, ENGINE_COLS));
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationStartTime] = useState(Date.now());

    const START_DELAYS = [0, 3000, 6000];
    const SAFETY_DISTANCE = 12;

    const fleetRef = useRef(
        AGV_FLEET_CONFIG.map(config => ({
            id: config.id,
            color: config.color,
            route: config.route,
            pos: { ...config.route[0] },
            targetIdx: 0,
            battery: 100,
            state: 'WAITING',
            isActive: false,
        }))
    );

    const [agvFleet, setAgvFleet] = useState(fleetRef.current);
    const primaryAgv = agvFleet[0];

    const handleStartSimulation = () => {
        setIsSimulating(!isSimulating);
    };

    useEffect(() => {
        engine.revealFullMap();
    }, [engine]);

    useEffect(() => {
        const canvas = document.getElementById('slam-map') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const speed = 0.5;
        let frameCount = 0;

        const render = () => {
            const elapsed = Date.now() - simulationStartTime;

            // 1. Update positions in Ref (60fps)
            fleetRef.current = fleetRef.current.map((agv, idx) => {
                // AGVs move autonomously (dynamic) regardless of the button
                if (!agv.isActive && elapsed >= START_DELAYS[idx]) {
                    agv.isActive = true;
                    agv.state = 'MOVING';
                }

                if (!agv.isActive) return agv;

                const target = agv.route[agv.targetIdx];
                const dx = target.x - agv.pos.x;
                const dy = target.y - agv.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= (isSimulating ? speed * 2 : speed)) {
                    agv.pos = { ...target };
                    agv.targetIdx = (agv.targetIdx + 1) % agv.route.length;
                } else {
                    const currentSpeed = isSimulating ? speed * 2 : speed;
                    const moveRatio = currentSpeed / dist;
                    const nextX = agv.pos.x + dx * moveRatio;
                    const nextY = agv.pos.y + dy * moveRatio;

                    let collisionRisk = false;
                    for (const other of fleetRef.current) {
                        if (other.id !== agv.id && other.isActive) {
                            const d = Math.sqrt(
                                Math.pow(nextX - other.pos.x, 2) +
                                Math.pow(nextY - other.pos.y, 2)
                            );
                            if (d < SAFETY_DISTANCE) {
                                collisionRisk = true;
                                break;
                            }
                        }
                    }

                    if (collisionRisk) {
                        agv.state = 'WAITING';
                    } else {
                        agv.pos = { x: nextX, y: nextY };
                        agv.state = 'MOVING';
                    }
                }

                agv.battery = Math.max(0, agv.battery - 0.0001);
                return agv;
            });

            // 2. Throttle React State updates (Sidebar/Telemetry) - ~6Hz
            frameCount++;
            if (frameCount % 10 === 0) {
                setAgvFleet([...fleetRef.current]);
            }

            // 3. Draw to Canvas (60fps)
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

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            for (const segment of AGV_PATH_SEGMENTS) {
                ctx.beginPath();
                ctx.moveTo(offsetX + segment[0].x * cellSize, offsetY + segment[0].y * cellSize);
                for (let i = 1; i < segment.length; i++) {
                    ctx.lineTo(offsetX + segment[i].x * cellSize, offsetY + segment[i].y * cellSize);
                }
                ctx.stroke();
            }
            ctx.setLineDash([]);

            fleetRef.current.forEach(agv => {
                ctx.fillStyle = agv.color;
                ctx.beginPath();
                ctx.arc(offsetX + agv.pos.x * cellSize, offsetY + agv.pos.y * cellSize, cellSize * 1.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = `bold ${Math.max(8, cellSize)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(agv.id.split('-')[1], offsetX + agv.pos.x * cellSize, offsetY + agv.pos.y * cellSize);
            });

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
    }, [engine, isSimulating, simulationStartTime]);

    const determineZone = (x: number, y: number) => {
        const zone = ZONES.find(z => x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h);
        return zone ? zone.name : 'Neutral Zone';
    };

    const primaryAgvZone = determineZone(primaryAgv.pos.x, primaryAgv.pos.y);

    return (
        <div className="dashboard-container">
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LayoutDashboard color="var(--accent-primary)" />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>NEURAL-GRID <span style={{ color: 'var(--text-dim)', fontWeight: 300 }}>WMS</span></h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={handleStartSimulation}
                        className={`simulation-btn ${isSimulating ? 'active' : ''}`}
                    >
                        {isSimulating ? (
                            <>
                                <Zap size={16} />
                                <span>Stop Streaming</span>
                            </>
                        ) : (
                            <>
                                <Zap size={16} />
                                <span>Start Streaming</span>
                            </>
                        )}
                    </button>
                    <div className={`telemetry-badge ${isSimulating ? '' : 'inactive'}`}>
                        <div className="status-dot"></div>
                        <span>{isSimulating ? 'STREAMING' : 'STANDBY'}</span>
                        {isSimulating && <span className="pulse-dot"></span>}
                    </div>
                    <Link to="/agv-station" className="agv-station-btn">
                        <Truck size={16} />
                        <span>AGV Station</span>
                    </Link>
                </div>
            </header>

            <aside className="panel">
                <div className="title">Factory Zones</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '12px' }}>MONITORING</div>
                {ZONES.map(zone => (
                    <div key={zone.id} className={`card zone-card ${primaryAgvZone === zone.name ? 'active' : ''}`} style={{ borderLeftColor: zone.color }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <zone.icon size={18} color={primaryAgvZone === zone.name ? zone.color : 'var(--text-dim)'} />
                            <span style={{ color: primaryAgvZone === zone.name ? zone.color : 'inherit' }}>{zone.name}</span>
                        </div>
                    </div>
                ))}
            </aside>

            <main className="panel center-panel">
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
                    <div className="title" style={{ marginBottom: '8px' }}>Real-Time SLAM Map</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>3 AGVs ACTIVE</div>
                </div>
                <canvas id="slam-map" style={{ width: '100%', height: '100%' }}></canvas>
            </main>

            <aside className="panel">
                <div className="title">Fleet Telemetry</div>
                {agvFleet.map(agv => (
                    <div key={agv.id} className="card" style={{ borderLeft: `3px solid ${agv.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 600, color: agv.color }}>{agv.id}</span>
                            <span className="status-indicator" style={{ backgroundColor: agv.state === 'MOVING' ? 'var(--status-moving)' : 'var(--status-idle)' }}></span>
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            X: {agv.pos.x.toFixed(1)} | Y: {agv.pos.y.toFixed(1)}
                        </div>
                        <div style={{ width: '100%', height: '3px', background: '#333', borderRadius: '2px', marginTop: '6px' }}>
                            <div style={{ width: `${agv.battery}%`, height: '100%', background: agv.color, borderRadius: '2px' }}></div>
                        </div>
                    </div>
                ))}
            </aside>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/agv-station" element={<AGVStation />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
