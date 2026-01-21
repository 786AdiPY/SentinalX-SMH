import { Kafka, Partitioners, logLevel } from 'kafkajs';

// --- 1. CONFIGURATION -------------------------------------------------------

// Validate environment variables
const API_KEY = "6AY2CIH4H7UBVPZX";
const API_SECRET = "cfltPrO/dig30COeulny9sF6mfykPDRP9wuRLUCaUq/aDoYUkBchX7s9R3c5QcQA";

if (!API_KEY || !API_SECRET) {
    console.error('❌ Missing CONFLUENT_API_KEY or CONFLUENT_API_SECRET environment variables');
    console.error('   Run with: CONFLUENT_API_KEY=xxx CONFLUENT_API_SECRET=yyy npm run simulate');
    process.exit(1);
}

const KAFKA_CONFIG = {
    clientId: 'neural-grid-simulator',
    brokers: ['pkc-xrnwx.asia-south2.gcp.confluent.cloud:9092'],
    ssl: true,
    sasl: {
        mechanism: 'plain' as const,
        username: API_KEY,
        password: API_SECRET,
    },
    connectionTimeout: 10000,
    authenticationTimeout: 10000,
    logLevel: logLevel.ERROR,
};

const TOPICS = {
    AGV1: 'AGV1',
    AGV2: 'AGV2',
    AGV3: 'AGV3',
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

    /**
     * Enhanced update with configurable safety distance for collision avoidance.
     * AGVs will wait if another AGV is within the safety distance.
     */
    updateWithCollisionAvoidance(activeAgvs: AGV[], safetyDistance: number) {
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
        } else {
            // 3. Collision Prediction with configurable safety distance
            const moveRatio = AGV_SPEED / dist;
            const nextX = this.currentPos.x + dx * moveRatio;
            const nextY = this.currentPos.y + dy * moveRatio;

            let collisionRisk = false;
            for (const other of activeAgvs) {
                if (other.id !== this.id) {
                    // Check distance to other AGV's current position and predicted position
                    const distToOther = Math.sqrt(
                        Math.pow(nextX - other.currentPos.x, 2) +
                        Math.pow(nextY - other.currentPos.y, 2)
                    );
                    if (distToOther < safetyDistance) {
                        collisionRisk = true;
                        break;
                    }
                }
            }

            if (collisionRisk) {
                status = "WAITING"; // Hold position to avoid collision
            } else {
                // Move towards target
                this.currentPos.x = nextX;
                this.currentPos.y = nextY;
            }
        }

        // 4. Return Data Payload
        return {
            id: this.id,
            x: parseFloat(this.currentPos.x.toFixed(2)),
            y: parseFloat(this.currentPos.y.toFixed(2)),
            battery: Math.max(10, 100 - (Date.now() % 300000) / 3000),
            status: status,
            timestamp: Date.now()
        };
    }
}

// --- 4. MAIN EXECUTION ------------------------------------------------------

// Staggered start delays (in milliseconds)
const START_DELAYS = [0, 3000, 6000]; // AGV1 starts immediately, AGV2 after 3s, AGV3 after 6s
const SAFETY_DISTANCE = 12; // Increased safety bubble for collision avoidance

async function main() {
    console.log("🚀 Starting Neural-Grid Fleet Simulation...");
    console.log("📋 AGVs will start in sequence with 3 second intervals");

    // Initialize Kafka
    const kafka = new Kafka(KAFKA_CONFIG);
    const producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    await producer.connect();
    console.log("✅ Connected to Confluent Cloud");

    // Initialize Fleet with staggered start flags
    const fleet = [
        new AGV("AGV-01", TOPICS.AGV1, ROUTES.AGV1, ROUTES.AGV1[0], "orange"),
        new AGV("AGV-02", TOPICS.AGV2, ROUTES.AGV2, ROUTES.AGV2[0], "cyan"),
        new AGV("AGV-03", TOPICS.AGV3, ROUTES.AGV3, ROUTES.AGV3[0], "green"),
    ];

    // Track which AGVs are active
    const activeFlags = [false, false, false];
    const startTime = Date.now();

    console.log("📡 Streaming Telemetry...");
    console.log("   AGV-01: Starting NOW ▶");

    // Simulation Loop (5Hz / 200ms)
    setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const messages = [];

        // Activate AGVs based on staggered delays
        for (let i = 0; i < fleet.length; i++) {
            if (!activeFlags[i] && elapsed >= START_DELAYS[i]) {
                activeFlags[i] = true;
                console.log(`\n   ${fleet[i].id}: Starting NOW ▶`);
            }
        }

        // Get list of active AGVs for collision detection
        const activeAgvs = fleet.filter((_, i) => activeFlags[i]);

        // Update only active AGVs
        for (let i = 0; i < fleet.length; i++) {
            const agv = fleet[i];
            let data;

            if (activeFlags[i]) {
                // AGV is active - update position with collision avoidance
                data = agv.updateWithCollisionAvoidance(activeAgvs, SAFETY_DISTANCE);
            } else {
                // AGV is waiting to start - send idle status at start position
                data = {
                    id: agv.id,
                    x: agv.currentPos.x,
                    y: agv.currentPos.y,
                    battery: 100,
                    status: "WAITING",
                    timestamp: Date.now()
                };
            }

            // Add to batch
            messages.push({
                topic: agv.topic,
                messages: [{
                    key: agv.id,
                    value: JSON.stringify(data)
                }]
            });
        }

        // Send batch to Kafka
        try {
            if (messages.length > 0) {
                await producer.sendBatch({ topicMessages: messages });
                process.stdout.write("."); // heartbeat
            }
        } catch (err) {
            console.error("\n❌ Kafka Error:", err);
        }

    }, 200);
}

main().catch(console.error);
