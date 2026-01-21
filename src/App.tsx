import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Battery,
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

// Red path segments that the AGV follows (array of polyline segments)
// Grid: 100 rows x 150 cols. Obstacles are rectangles at specific positions.
// Path placed in corridors between obstacles.
const AGV_PATH_SEGMENTS = [
    // Outer perimeter path (inside the border walls)
    [{ x: 5, y: 5 }, { x: 5, y: 94 }],     // Left vertical
    [{ x: 5, y: 5 }, { x: 144, y: 5 }],    // Top horizontal
    [{ x: 144, y: 5 }, { x: 144, y: 94 }], // Right vertical  
    [{ x: 5, y: 94 }, { x: 144, y: 94 }],  // Bottom horizontal

    // Middle horizontal corridor (between top and bottom zones)
    [{ x: 5, y: 42 }, { x: 52, y: 42 }],   // Left section
    [{ x: 52, y: 42 }, { x: 52, y: 5 }],   // Up to top
    [{ x: 50, y: 42 }, { x: 97, y: 42 }],  // Across middle
    [{ x: 97, y: 42 }, { x: 97, y: 5 }],   // Up to top corridor
    [{ x: 97, y: 5 }, { x: 107, y: 5 }],   // Across to control room area
    [{ x: 107, y: 5 }, { x: 107, y: 37 }], // Down to AGV station
    [{ x: 107, y: 37 }, { x: 144, y: 37 }],// Across to right side

    // Bottom section corridors - between Supply Area and Shipping
    [{ x: 5, y: 67 }, { x: 52, y: 67 }],   // Above bottom zones
    [{ x: 52, y: 67 }, { x: 52, y: 94 }],  // Down between zones
    [{ x: 52, y: 42 }, { x: 52, y: 67 }],  // Vertical connector

    // Right side of Shipping & EXIT
    [{ x: 97, y: 67 }, { x: 97, y: 94 }],  // Vertical on right of shipping
    [{ x: 97, y: 67 }, { x: 144, y: 67 }], // Horizontal to AGV station area

    // === ZONE ENTRANCE PATHS ===
    // Workshop entrance (bottom side at col ~27, row 39 -> connects to corridor at row 42)
    [{ x: 27, y: 39 }, { x: 27, y: 42 }],

    // Material Space entrance (bottom side at col ~75, row 39 -> connects to corridor at row 42)
    [{ x: 75, y: 39 }, { x: 75, y: 42 }],

    // Control Room entrance (bottom side at col ~125, row 29 -> connects down to AGV station corridor)
    [{ x: 125, y: 29 }, { x: 125, y: 37 }],

    // AGV's Station entrance (left side at col 100, row ~52 -> connects to right corridor)      
    [{ x: 97, y: 52 }, { x: 100, y: 52 }],

    // Supply Area entrance (top side at col ~27, row 70 -> connects to corridor at row 67)
    [{ x: 27, y: 67 }, { x: 27, y: 70 }],

    // Shipping & EXIT entrance (top side at col ~75, row 70 -> connects to corridor at row 67)
    [{ x: 75, y: 67 }, { x: 75, y: 70 }],

    // Additional connectors for zone entrances
    [{ x: 27, y: 42 }, { x: 52, y: 42 }],  // Workshop to main corridor
    [{ x: 75, y: 42 }, { x: 97, y: 42 }],  // Material Space to main corridor
    [{ x: 125, y: 37 }, { x: 144, y: 37 }],// Control Room to right corridor
    [{ x: 97, y: 52 }, { x: 97, y: 67 }],  // AGV Station connector
    [{ x: 27, y: 67 }, { x: 52, y: 67 }],  // Supply Area to main corridor
    [{ x: 75, y: 67 }, { x: 97, y: 67 }],  // Shipping to right corridor
];

// Patrol waypoints following the path (in corridor spaces)
const AGV_PATROL_PATH = [
    { x: 50, y: 42 },  // Start in middle corridor
    { x: 5, y: 42 },   // Go left
    { x: 5, y: 5 },    // Go up to top-left corner
    { x: 52, y: 5 },   // Go right across top
    { x: 97, y: 5 },   // Continue right
    { x: 107, y: 5 },  // Go to control room area
    { x: 107, y: 37 }, // Go down to AGV station
    { x: 144, y: 37 }, // Go right to edge
    { x: 144, y: 67 }, // Go down
    { x: 144, y: 94 }, // Go to bottom-right corner
    { x: 97, y: 94 },  // Go left
    { x: 52, y: 94 },  // Continue left (between zones)
    { x: 52, y: 67 },  // Go up between Supply and Shipping
    { x: 5, y: 67 },   // Go left
    { x: 5, y: 94 },   // Go down to bottom-left
    { x: 5, y: 42 },   // Go back up
    { x: 50, y: 42 },  // Return to middle
];

// Helper function to check if a point is on any path segment (within tolerance)
const isPointOnPath = (x: number, y: number, tolerance: number = 2): boolean => {
    for (const segment of AGV_PATH_SEGMENTS) {
        const [p1, p2] = segment;
        // Check if point is on this line segment
        const minX = Math.min(p1.x, p2.x) - tolerance;
        const maxX = Math.max(p1.x, p2.x) + tolerance;
        const minY = Math.min(p1.y, p2.y) - tolerance;
        const maxY = Math.max(p1.y, p2.y) + tolerance;

        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            // Check distance to line segment
            if (p1.x === p2.x) {
                // Vertical line
                if (Math.abs(x - p1.x) <= tolerance) return true;
            } else if (p1.y === p2.y) {
                // Horizontal line
                if (Math.abs(y - p1.y) <= tolerance) return true;
            }
        }
    }
    return false;
};

// Find the nearest point on any path segment
const getNearestPathPoint = (x: number, y: number): { x: number, y: number } => {
    let nearestPoint = { x, y };
    let minDist = Infinity;

    for (const segment of AGV_PATH_SEGMENTS) {
        const [p1, p2] = segment;
        let projX: number, projY: number;

        if (p1.x === p2.x) {
            // Vertical line
            projX = p1.x;
            projY = Math.max(Math.min(p1.y, p2.y), Math.min(Math.max(p1.y, p2.y), y));
        } else {
            // Horizontal line
            projX = Math.max(Math.min(p1.x, p2.x), Math.min(Math.max(p1.x, p2.x), x));
            projY = p1.y;
        }

        const dist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));
        if (dist < minDist) {
            minDist = dist;
            nearestPoint = { x: projX, y: projY };
        }
    }

    return nearestPoint;
};
function Dashboard() {
    const [engine] = useState(new SLAMEngine(ENGINE_ROWS, ENGINE_COLS));
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedZone, setSelectedZone] = useState<typeof ZONES[0] | null>(null);
    const [agvStatus, setAgvStatus] = useState({
        state: 'Idle',
        battery: 100,
        currentZone: 'Unknown',
        coordinates: { x: 75, y: 50 },
        speed: 0
    });

    useEffect(() => {
        // Reveal the entire map immediately on initialization
        engine.revealFullMap();
    }, [engine]);

    useEffect(() => {
        const canvas = document.getElementById('slam-map') as HTMLCanvasElement;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        let patrolIdx = 0;

        const render = () => {
            const speed = 0.3;

            // Simulated telemetry - AGV follows patrol path automatically
            const target = AGV_PATROL_PATH[patrolIdx];
            const dist = Math.sqrt(Math.pow(target.x - engine.agvPos.x, 2) + Math.pow(target.y - engine.agvPos.y, 2));

            let dx = 0, dy = 0;
            if (dist > 1) {
                dx = ((target.x - engine.agvPos.x) / dist) * speed;
                dy = ((target.y - engine.agvPos.y) / dist) * speed;
            } else {
                patrolIdx = (patrolIdx + 1) % AGV_PATROL_PATH.length;
            }

            const moved = engine.move(dx, dy);

            // Constrain AGV to path
            if (!isPointOnPath(engine.agvPos.x, engine.agvPos.y, 3)) {
                const nearestPath = getNearestPathPoint(engine.agvPos.x, engine.agvPos.y);
                engine.agvPos.x = nearestPath.x;
                engine.agvPos.y = nearestPath.y;
            }

            // Only drain battery when actually moving
            const actuallyMoved = moved && (dx !== 0 || dy !== 0);
            setAgvStatus(prev => ({
                ...prev,
                state: actuallyMoved ? 'Moving' : 'Idle',
                battery: actuallyMoved ? Math.max(0, prev.battery - 0.003) : prev.battery,
                currentZone: determineZone(engine.agvPos.x, engine.agvPos.y),
                coordinates: { x: engine.agvPos.x, y: engine.agvPos.y },
                speed: actuallyMoved ? speed : 0
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

            // Draw the red dotted AGV path
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
            ctx.lineWidth = 1;

            // Draw AGV marker
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
    }, [engine, selectedZone]);

    const determineZone = (x: number, y: number) => {
        const zone = ZONES.find(z => x >= z.rect.x && x <= z.rect.x + z.rect.w && y >= z.rect.y && y <= z.rect.y + z.rect.h);
        return zone ? zone.name : 'Neutral Zone';
    };

    return (
        <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <header className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LayoutDashboard color="var(--accent-primary)" />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>NEURAL-GRID <span style={{ color: 'var(--text-dim)', fontWeight: 300 }}>WMS</span></h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="telemetry-badge">
                        <Activity size={14} />
                        <span>LIVE TELEMETRY</span>
                        <span className="pulse-dot"></span>
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
                            className={`card zone-card ${agvStatus.currentZone === zone.name ? 'active' : ''} ${selectedZone?.id === zone.id ? 'selected' : ''}`}
                            style={{ borderLeftColor: zone.color, cursor: 'pointer' }}
                            onClick={() => setSelectedZone(zone)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <zone.icon size={18} color={selectedZone?.id === zone.id ? zone.color : (agvStatus.currentZone === zone.name ? zone.color : 'var(--text-dim)')} />
                                <span style={{ color: selectedZone?.id === zone.id ? zone.color : (agvStatus.currentZone === zone.name ? zone.color : 'inherit') }}>{zone.name}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="collapsed-icons">
                    {ZONES.map(zone => (
                        <div
                            key={zone.id}
                            className={`collapsed-icon ${agvStatus.currentZone === zone.name ? 'active' : ''} ${selectedZone?.id === zone.id ? 'selected' : ''}`}
                            title={zone.name}
                            onClick={() => setSelectedZone(zone)}
                            style={{ cursor: 'pointer' }}
                        >
                            <zone.icon size={20} color={selectedZone?.id === zone.id ? zone.color : (agvStatus.currentZone === zone.name ? zone.color : 'var(--text-dim)')} />
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
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>TELEMETRY STREAM ACTIVE</div>
                        </div>
                        <canvas id="slam-map" style={{ width: '100%', height: '100%' }}></canvas>
                    </main>

                    <aside className="panel">
                        <div className="title">Live Telemetry</div>
                        <div className="card">
                            <div className="title" style={{ fontSize: '0.7rem' }}>Coordinates</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>X:</span>
                                    <span style={{ fontWeight: 600 }}>{agvStatus.coordinates.x.toFixed(1)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-dim)' }}>Y:</span>
                                    <span style={{ fontWeight: 600 }}>{agvStatus.coordinates.y.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="title" style={{ fontSize: '0.7rem' }}>Status</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>{agvStatus.state}</span>
                                <span className="status-indicator" style={{ backgroundColor: agvStatus.state === 'Moving' ? 'var(--status-moving)' : 'var(--status-idle)' }}></span>
                            </div>
                        </div>
                        <div className="card">
                            <div className="title" style={{ fontSize: '0.7rem' }}>Speed</div>
                            <span style={{ fontWeight: 600 }}>{agvStatus.speed.toFixed(2)} m/s</span>
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
                </>
            )}
        </div>
    );
}

// Main App with Router
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

