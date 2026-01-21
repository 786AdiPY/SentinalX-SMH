import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Battery,
    Gauge,
    Package,
    MapPin,
    Activity,
    Zap,
    Clock,
    CheckCircle,
    AlertTriangle,
    Settings
} from 'lucide-react';
import type { TelemetryData, AGVInfo } from '../types/telemetry';
import './AGVStation.css';

// Mock AGV fleet data
const AGV_FLEET: AGVInfo[] = [
    {
        id: 'agv-01',
        name: 'AGV-01',
        model: 'SentinalX Pro',
        capacity: 500,
        maxSpeed: 1.5,
        batteryCapacity: 48,
        lastMaintenance: '2026-01-15',
        totalDistance: 1247.5,
        tasksCompleted: 892
    },
    {
        id: 'agv-02',
        name: 'AGV-02',
        model: 'SentinalX Pro',
        capacity: 500,
        maxSpeed: 1.5,
        batteryCapacity: 48,
        lastMaintenance: '2026-01-18',
        totalDistance: 986.2,
        tasksCompleted: 654
    },
    {
        id: 'agv-03',
        name: 'AGV-03',
        model: 'SentinalX Lite',
        capacity: 300,
        maxSpeed: 2.0,
        batteryCapacity: 36,
        lastMaintenance: '2026-01-20',
        totalDistance: 523.8,
        tasksCompleted: 421
    }
];

// Simulated live telemetry for each AGV
const generateTelemetry = (agv: AGVInfo): TelemetryData => {
    const statuses: TelemetryData['status'][] = ['Moving', 'Idle', 'Charging', 'Loading'];
    const zones = ['Workshop', 'Material Space', 'Control Room', 'AGV Station', 'Supply Area', 'Shipping & EXIT'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    return {
        agvId: agv.id,
        name: agv.name,
        coordinates: {
            x: Math.round((Math.random() * 140 + 5) * 10) / 10,
            y: Math.round((Math.random() * 90 + 5) * 10) / 10
        },
        heading: Math.round(Math.random() * 360),
        speed: randomStatus === 'Moving' ? Math.round(Math.random() * agv.maxSpeed * 100) / 100 : 0,
        battery: Math.round(50 + Math.random() * 50),
        load: randomStatus === 'Loading' || randomStatus === 'Moving' ? Math.round(Math.random() * agv.capacity) : 0,
        status: randomStatus,
        currentZone: zones[Math.floor(Math.random() * zones.length)],
        timestamp: Date.now()
    };
};

const getStatusColor = (status: TelemetryData['status']) => {
    switch (status) {
        case 'Moving': return '#22c55e';
        case 'Idle': return '#6b7280';
        case 'Charging': return '#eab308';
        case 'Loading': return '#3b82f6';
        case 'Error': return '#ef4444';
        default: return '#6b7280';
    }
};

const getStatusIcon = (status: TelemetryData['status']) => {
    switch (status) {
        case 'Moving': return <Activity size={16} />;
        case 'Idle': return <Clock size={16} />;
        case 'Charging': return <Zap size={16} />;
        case 'Loading': return <Package size={16} />;
        case 'Error': return <AlertTriangle size={16} />;
        default: return <Activity size={16} />;
    }
};

function AGVStation() {
    const [telemetryData, setTelemetryData] = useState<Map<string, TelemetryData>>(new Map());
    const [selectedAGV, setSelectedAGV] = useState<string | null>(null);

    useEffect(() => {
        // Initial telemetry
        const initialData = new Map<string, TelemetryData>();
        AGV_FLEET.forEach(agv => {
            initialData.set(agv.id, generateTelemetry(agv));
        });
        setTelemetryData(initialData);

        // Update telemetry every 2 seconds
        const interval = setInterval(() => {
            setTelemetryData(prev => {
                const newData = new Map(prev);
                AGV_FLEET.forEach(agv => {
                    const current = newData.get(agv.id);
                    if (current) {
                        // Gradual updates for more realistic feel
                        newData.set(agv.id, {
                            ...current,
                            coordinates: {
                                x: Math.round((current.coordinates.x + (Math.random() - 0.5) * 2) * 10) / 10,
                                y: Math.round((current.coordinates.y + (Math.random() - 0.5) * 2) * 10) / 10
                            },
                            battery: Math.max(0, Math.min(100, current.battery + (Math.random() - 0.5) * 2)),
                            timestamp: Date.now()
                        });
                    }
                });
                return newData;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const fleetStats = {
        total: AGV_FLEET.length,
        active: Array.from(telemetryData.values()).filter(t => t.status === 'Moving').length,
        idle: Array.from(telemetryData.values()).filter(t => t.status === 'Idle').length,
        charging: Array.from(telemetryData.values()).filter(t => t.status === 'Charging').length
    };

    return (
        <div className="agv-station-container">
            <header className="agv-header">
                <div className="header-left">
                    <Link to="/" className="back-button">
                        <ArrowLeft size={20} />
                        <span>Back to Dashboard</span>
                    </Link>
                </div>
                <h1 className="header-title">
                    AGV STATION <span className="header-subtitle">FLEET MANAGEMENT</span>
                </h1>
                <div className="header-right">
                    <div className="connection-status">
                        <span className="status-dot active"></span>
                        <span>LIVE TELEMETRY</span>
                    </div>
                </div>
            </header>

            <div className="fleet-overview">
                <div className="stat-card">
                    <div className="stat-value">{fleetStats.total}</div>
                    <div className="stat-label">Total AGVs</div>
                </div>
                <div className="stat-card active">
                    <div className="stat-value">{fleetStats.active}</div>
                    <div className="stat-label">Active</div>
                </div>
                <div className="stat-card idle">
                    <div className="stat-value">{fleetStats.idle}</div>
                    <div className="stat-label">Idle</div>
                </div>
                <div className="stat-card charging">
                    <div className="stat-value">{fleetStats.charging}</div>
                    <div className="stat-label">Charging</div>
                </div>
            </div>

            <div className="agv-grid">
                {AGV_FLEET.map(agv => {
                    const telemetry = telemetryData.get(agv.id);
                    const isSelected = selectedAGV === agv.id;

                    return (
                        <div
                            key={agv.id}
                            className={`agv-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setSelectedAGV(isSelected ? null : agv.id)}
                        >
                            <div className="agv-card-header">
                                <h3 className="agv-name">{agv.name}</h3>
                                <div
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(telemetry?.status || 'Idle') }}
                                >
                                    {getStatusIcon(telemetry?.status || 'Idle')}
                                    <span>{telemetry?.status || 'Unknown'}</span>
                                </div>
                            </div>

                            <div className="agv-model">{agv.model}</div>

                            <div className="telemetry-grid">
                                <div className="telemetry-item">
                                    <Battery size={16} className="telemetry-icon" />
                                    <div className="telemetry-content">
                                        <div className="telemetry-value">{Math.round(telemetry?.battery || 0)}%</div>
                                        <div className="telemetry-label">Battery</div>
                                    </div>
                                    <div className="battery-bar">
                                        <div
                                            className="battery-fill"
                                            style={{
                                                width: `${telemetry?.battery || 0}%`,
                                                backgroundColor: (telemetry?.battery || 0) > 20 ? '#22c55e' : '#ef4444'
                                            }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="telemetry-item">
                                    <Gauge size={16} className="telemetry-icon" />
                                    <div className="telemetry-content">
                                        <div className="telemetry-value">{telemetry?.speed || 0} m/s</div>
                                        <div className="telemetry-label">Speed</div>
                                    </div>
                                </div>

                                <div className="telemetry-item">
                                    <Package size={16} className="telemetry-icon" />
                                    <div className="telemetry-content">
                                        <div className="telemetry-value">{telemetry?.load || 0} kg</div>
                                        <div className="telemetry-label">Load</div>
                                    </div>
                                </div>

                                <div className="telemetry-item">
                                    <MapPin size={16} className="telemetry-icon" />
                                    <div className="telemetry-content">
                                        <div className="telemetry-value">{telemetry?.currentZone || 'Unknown'}</div>
                                        <div className="telemetry-label">Zone</div>
                                    </div>
                                </div>
                            </div>

                            {isSelected && (
                                <div className="agv-details">
                                    <div className="details-section">
                                        <h4>Live Coordinates</h4>
                                        <div className="coordinates">
                                            <span>X: {telemetry?.coordinates.x.toFixed(1)}</span>
                                            <span>Y: {telemetry?.coordinates.y.toFixed(1)}</span>
                                            <span>Heading: {telemetry?.heading}°</span>
                                        </div>
                                    </div>

                                    <div className="details-section">
                                        <h4>Statistics</h4>
                                        <div className="stats-grid">
                                            <div className="stat-item">
                                                <CheckCircle size={14} />
                                                <span>{agv.tasksCompleted} tasks</span>
                                            </div>
                                            <div className="stat-item">
                                                <MapPin size={14} />
                                                <span>{agv.totalDistance} km</span>
                                            </div>
                                            <div className="stat-item">
                                                <Settings size={14} />
                                                <span>Maint: {agv.lastMaintenance}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="details-section">
                                        <h4>Specifications</h4>
                                        <div className="specs-grid">
                                            <span>Max Load: {agv.capacity} kg</span>
                                            <span>Max Speed: {agv.maxSpeed} m/s</span>
                                            <span>Battery: {agv.batteryCapacity} kWh</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default AGVStation;
