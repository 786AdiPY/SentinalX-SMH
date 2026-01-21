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
    Activity,
    Package,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { SLAMEngine, CellType } from './slam-engine';
import AGVStation from './pages/AGVStation';
import SheetView from './components/SheetView';
import { Portfolio } from './components/Portfolio';
import './App.css';

const ENGINE_ROWS = 100;
const ENGINE_COLS = 150;

// Factory zones displayed in sidebar - Ordered as per user request
// Each zone has a Google Sheet URL for viewing zone data
const SHEET_ID = '1-rodWOO9YSiQwjfkIX_haH5Ofr7jXksyW96LlPtN1iM';
const ZONES = [
    { id: 'material-storage', name: 'Material Storage', icon: Box, rect: { x: 55, y: 10, w: 40, h: 30 }, color: '#22c55e', gid: '0' },
    { id: 'warehouse-1', name: 'Warehouse 1', icon: Settings, rect: { x: 10, y: 10, w: 35, h: 30 }, color: '#f97316', gid: '1637177230' },
    { id: 'warehouse-2', name: 'Warehouse 2', icon: Shield, rect: { x: 110, y: 10, w: 30, h: 20 }, color: '#3b82f6', gid: '23141855' },
    { id: 'warehouse-3', name: 'Warehouse 3', icon: Package, rect: { x: 100, y: 40, w: 40, h: 25 }, color: '#8b5cf6', gid: '1381207676' },
    { id: 'supply-room', name: 'Supply Room', icon: Navigation, rect: { x: 10, y: 70, w: 35, h: 22 }, color: '#a855f7', gid: '61275469' },
    { id: 'shipping-exit', name: 'Shipping and Exit', icon: Zap, rect: { x: 55, y: 70, w: 40, h: 22 }, color: '#ef4444', gid: '1687489186' },
];

// Red path segments that the AGV follows
const AGV_PATH_SEGMENTS = [
    [{ x: 5, y: 5 }, { x: 5, y: 94 }],
    [{ x: 5, y: 5 }, { x: 144, y: 5 }],
    [{ x: 144, y: 5 }, { x: 144, y: 94 }],
    [{ x: 5, y: 94 }, { x: 144, y: 94 }],
    [{ x: 5, y: 42 }, { x: 52, y: 42 }],
    [{ x: 52, y: 42 }, { x: 52, y: 5 }],
    [{ x: 50, y: 42 }, { x: 97, y: 42 }],
    [{ x: 97, y: 42 }, { x: 97, y: 5 }],
    [{ x: 97, y: 5 }, { x: 107, y: 5 }],
    [{ x: 107, y: 5 }, { x: 107, y: 37 }],
    [{ x: 107, y: 37 }, { x: 144, y: 37 }],
    [{ x: 5, y: 67 }, { x: 52, y: 67 }],
    [{ x: 52, y: 67 }, { x: 52, y: 94 }],
    [{ x: 52, y: 42 }, { x: 52, y: 67 }],
    [{ x: 97, y: 67 }, { x: 97, y: 94 }],
    [{ x: 97, y: 67 }, { x: 144, y: 67 }],
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null);
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

            // Update AGV positions
            fleetRef.current = fleetRef.current.map((agv, idx) => {
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

            // Throttle React State updates
            frameCount++;
            if (frameCount % 10 === 0) {
                setAgvFleet([...fleetRef.current]);
            }

            // Draw to Canvas
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
    }, [engine, isSimulating, simulationStartTime, selectedZone]);

    const determineZone = (x: number, y: number) => {
        const zone = ZONES.find(z => x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h);
        return zone ? zone.name : 'Neutral Zone';
    };

    const primaryAgvZone = determineZone(primaryAgv.pos.x, primaryAgv.pos.y);

    return (
        <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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

            <aside className={`panel sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <button
                    className="sidebar-toggle"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>

                <div className="sidebar-content">
                    <div className="title">Factory Zones</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '12px' }}>MONITORING</div>
                    {ZONES.map(zone => (
                        <div
                            key={zone.id}
                            className={`card zone-card ${primaryAgvZone === zone.name ? 'active' : ''} ${selectedZone?.id === zone.id ? 'selected' : ''}`}
                            style={{ borderLeftColor: zone.color, cursor: 'pointer' }}
                            onClick={() => setSelectedZone(zone)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <zone.icon size={18} color={selectedZone?.id === zone.id ? zone.color : (primaryAgvZone === zone.name ? zone.color : 'var(--text-dim)')} />
                                <span style={{ color: selectedZone?.id === zone.id ? zone.color : (primaryAgvZone === zone.name ? zone.color : 'inherit') }}>{zone.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="collapsed-icons">
                    {ZONES.map(zone => (
                        <div
                            key={zone.id}
                            className={`collapsed-icon ${primaryAgvZone === zone.name ? 'active' : ''} ${selectedZone?.id === zone.id ? 'selected' : ''}`}
                            title={zone.name}
                            onClick={() => setSelectedZone(zone)}
                            style={{ cursor: 'pointer' }}
                        >
                            <zone.icon size={20} color={selectedZone?.id === zone.id ? zone.color : (primaryAgvZone === zone.name ? zone.color : 'var(--text-dim)')} />
                        </div>
                    ))}
                </div>
            </aside>

            {selectedZone ? (
                <SheetView
                    zoneName={selectedZone.name}
                    zoneColor={selectedZone.color}
                    sheetId={SHEET_ID}
                    gid={selectedZone.gid}
                    onBack={() => setSelectedZone(null)}
                />
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Portfolio />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/agv-station" element={<AGVStation />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
