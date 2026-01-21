export interface TelemetryData {
    agvId: string;
    name: string;
    coordinates: { x: number; y: number };
    heading: number;      // degrees
    speed: number;        // m/s
    battery: number;      // percentage
    load: number;         // kg
    status: 'Moving' | 'Idle' | 'Charging' | 'Loading' | 'Error';
    currentZone: string;
    timestamp: number;
}

export interface AGVInfo {
    id: string;
    name: string;
    model: string;
    capacity: number;     // max load in kg
    maxSpeed: number;     // m/s
    batteryCapacity: number; // kWh
    lastMaintenance: string;
    totalDistance: number;  // km
    tasksCompleted: number;
}
