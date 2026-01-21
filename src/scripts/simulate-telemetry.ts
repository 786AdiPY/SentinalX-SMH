import { Kafka, Partitioners } from 'kafkajs';

/**
 * ============================================================================
 * 🛡️ RANGE SHIELD / NEURAL-GRID: FLEET SIMULATOR
 * ============================================================================
 * * This script simulates 3 AGVs moving along specific "Pac-Man" style paths defined 
 * by the user's map configuration.
 * * FEATURES:
 * - exact path following (no diagonal shortcuts)
 * - collision avoidance (waits if path is blocked)
 * - real-time telemetry streaming to Confluent Cloud
 */

// --- 1. CONFIGURATION -------------------------------------------------------

const KAFKA_CONFIG = {
    // 🔴 TODO: Replace with your Confluent Cloud details
    brokers: ['CONFLUENT_BOOTSTRAP_SERVER'],
    ssl: true,
    sasl: {
        mechanism: 'plain' as const,
        username: 'CONFLUENT_API_KEY',
        password: 'CONFLUENT_API_SECRET',
    },
};

const TOPICS = {
    AGV1: 'vehicle_gps_stream',
    AGV2: 'vehicle_health_stream',
    AGV3: 'vehicle_telementry',
};

// Speed in coordinate units per tick (approx pixels per 200ms)
const AGV_SPEED = 2.5;

// --- 2. MAP & ROUTE DEFINITIONS ---------------------------------------------

interface Point { x: number; y: number; }

/**
 * The exact segments provided by the user. 
 * Used here for reference and potential graph building, 
 * though the AGVs follow specific sequences derived from these.
 */
const AGV_PATH_SEGMENTS = [
    // Outer perimeter
    [{ x: 5, y: 5 }, { x: 5, y: 94 }],
    [{ x: 5, y: 5 }, { x: 144, y: 5 }],
    [{ x: 144, y: 5 }, { x: 144, y: 94 }],
    [{ x: 5, y: 94 }, { x: 144, y: 94 }],

    // Middle horizontal corridor
    [{ x: 5, y: 42 }, { x: 52, y: 42 }],
    [{ x: 52, y: 42 }, { x: 52, y: 5 }],
    [{ x: 50, y: 42 }, { x: 97, y: 42 }],
    [{ x: 97, y: 42 }, { x: 97, y: 5 }],
    [{ x: 97, y: 5 }, { x: 107, y: 5 }],
    [{ x: 107, y: 5 }, { x: 107, y: 37 }],
    [{ x: 107, y: 37 }, { x: 144, y: 37 }],

    // Bottom section corridors
    [{ x: 5, y: 67 }, { x: 52, y: 67 }],
    [{ x: 52, y: 67 }, { x: 52, y: 94 }],
    [{ x: 52, y: 42 }, { x: 52, y: 67 }],

    // Right side of Shipping & EXIT
    [{ x: 97, y: 67 }, { x: 97, y: 94 }],
    [{ x: 97, y: 67 }, { x: 144, y: 67 }],

    // Zone Entrances
    [{ x: 27, y: 39 }, { x: 27, y: 42 }],
    [{ x: 75, y: 39 }, { x: 75, y: 42 }],
    [{ x: 125, y: 29 }, { x: 125, y: 37 }],
    [{ x: 97, y: 52 }, { x: 100, y: 52 }],
    [{ x: 27, y: 67 }, { x: 27, y: 70 }],
    [{ x: 75, y: 67 }, { x: 75, y: 70 }],

    // Connectors
    [{ x: 27, y: 42 }, { x: 52, y: 42 }],
    [{ x: 75, y: 42 }, { x: 97, y: 42 }],
    [{ x: 125, y: 37 }, { x: 144, y: 37 }],
    [{ x: 97, y: 52 }, { x: 97, y: 67 }],
    [{ x: 27, y: 67 }, { x: 52, y: 67 }],
    [{ x: 75, y: 67 }, { x: 97, y: 67 }],
];

/**
 * PRE-DEFINED LOOPS based on the segments above.
 * Each array is a sequence of checkpoints the AGV must visit in order.
 */
const ROUTES = {
    // ROUTE 1: Outer Patrol (Perimeter)
    AGV1: [
        { x: 5, y: 5 }, { x: 144, y: 5 }, { x: 144, y: 94 }, { x: 5, y: 94 }
    ],

    // ROUTE 2: Upper Internal Loop (Workshop -> Material -> Control)
    AGV2: [
        { x: 5, y: 42 }, { x: 52, y: 42 }, { x: 52, y: 5 }, { x: 97, y: 5 },
        { x: 107, y: 5 }, { x: 107, y: 37 }, { x: 144, y: 37 }, { x: 144, y: 67 },
        { x: 97, y: 67 }, { x: 97, y: 42 }, { x: 50, y: 42 }
    ],

    // ROUTE 3: Lower Internal Loop (Supply -> Shipping)
    AGV3: [
        { x: 5, y: 67 }, { x: 52, y: 67 }, { x: 52, y: 94 }, { x: 97, y: 94 },
        { x: 97, y: 67 }, { x: 52, y: 67 }, { x: 52, y: 42 }, { x: 5, y: 42 }
    ]
};

// --- 3. CLASS DEFINITION ----------------------------------------------------

class AGV {
    id: string;
    topic: string;
    color: string;

    // Navigation State
    currentPos: Point;
    route: Point[];
    targetIndex: number;

    constructor(id: string, topic: string, route: Point[], startPos: Point, color: string) {
        this.id = id;
        this.topic = topic;
        this.route = route;
        this.currentPos = { ...startPos };
        this.targetIndex = 0; // Start aiming for the first point
        this.color = color;
    }

    /**
     * Calculates the next position for this tick.
     * Returns telemetry data to be sent to Kafka.
     */
    update(allAgvs: AGV[]) {
        const target = this.route[this.targetIndex];

        // 1. Calculate vector to target
        const dx = target.x - this.currentPos.x;
        const dy = target.y - this.currentPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let status = "MOVING";

        // 2. Check Arrival
        if (dist <= AGV_SPEED) {
            // Snap to target
            this.currentPos = { ...target };
            // Advance to next waypoint (Looping)
            this.targetIndex = (this.targetIndex + 1) % this.route.length;
        }
        else {
            // 3. Collision Prediction (Simple "Bubble" check)
            // Look ahead: If I move, will I be too close to another AGV?
            const moveRatio = AGV_SPEED / dist;
            const nextX = this.currentPos.x + dx * moveRatio;
            const nextY = this.currentPos.y + dy * moveRatio;

            let collisionRisk = false;
            for (const other of allAgvs) {
                if (other.id !== this.id) {
                    const distToOther = Math.sqrt(
                        Math.pow(nextX - other.currentPos.x, 2) +
                        Math.pow(nextY - other.currentPos.y, 2)
                    );
                    if (distToOther < 8) { // 8 unit safety bubble
                        collisionRisk = true;
                    }
                }
            }

            if (collisionRisk) {
                status = "WAITING"; // Hold position
            } else {
                // Move
                this.currentPos.x = nextX;
                this.currentPos.y = nextY;
            }
        }

        // 4. Return Data Payload
        return {
            id: this.id,
            x: parseFloat(this.currentPos.x.toFixed(2)),
            y: parseFloat(this.currentPos.y.toFixed(2)),
            battery: Math.max(10, 100 - (Date.now() % 300000) / 3000), // Simulated drain
            status: status,
            timestamp: Date.now()
        };
    }
}

// --- 4. MAIN EXECUTION ------------------------------------------------------

async function main() {
    console.log("🚀 Starting Neural-Grid Fleet Simulation...");

    // Initialize Kafka
    const kafka = new Kafka(KAFKA_CONFIG);
    const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    await producer.connect();
    console.log("✅ Connected to Confluent Cloud");

    // Initialize Fleet
    const fleet = [
        new AGV("AGV-01", TOPICS.AGV1, ROUTES.AGV1, ROUTES.AGV1[0], "orange"),
        new AGV("AGV-02", TOPICS.AGV2, ROUTES.AGV2, ROUTES.AGV2[0], "cyan"),
        new AGV("AGV-03", TOPICS.AGV3, ROUTES.AGV3, ROUTES.AGV3[0], "green"),
    ];

    console.log("📡 Streaming Telemetry...");

    // Simulation Loop (5Hz / 200ms)
    setInterval(async () => {
        const messages = [];

        // Update all AGVs
        for (const agv of fleet) {
            const data = agv.update(fleet);

            // Add to batch
            messages.push({
                topic: agv.topic,
                messages: [{
                    key: agv.id,
                    value: JSON.stringify(data)
                }]
            });

            // Local log for debugging
            // console.log(`${agv.id}: ${data.status} at [${data.x}, ${data.y}]`);
        }

        // Send batch to Kafka
        try {
            if (messages.length > 0) {
                await producer.sendBatch({ topicMessages: messages });
                process.stdout.write("."); // heartbeat
            }
        } catch (err) {
            console.error("❌ Kafka Error:", err);
        }

    }, 200);
}

main().catch(console.error);