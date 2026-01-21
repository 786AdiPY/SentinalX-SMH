export type Point = { x: number; y: number };

export const CellType = { UNKNOWN: 0, FREE: 1, WALL: 2 } as const;
export type CellType = typeof CellType[keyof typeof CellType];

export class SLAMEngine {
    grid: number[][];
    rows: number;
    cols: number;
    agvPos: Point;
    agvAngle: number = 0;
    groundTruth: number[][];

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
        this.grid = Array(rows).fill(0).map(() => Array(cols).fill(CellType.UNKNOWN));
        this.groundTruth = Array(rows).fill(0).map(() => Array(cols).fill(CellType.FREE));
        this.agvPos = { x: cols / 2, y: rows / 2 };
        this.initGroundTruth();
    }

    private initGroundTruth() {
        for (let i = 0; i < this.rows; i++) {
            this.groundTruth[i][0] = CellType.WALL;
            this.groundTruth[i][this.cols - 1] = CellType.WALL;
        }
        for (let j = 0; j < this.cols; j++) {
            this.groundTruth[0][j] = CellType.WALL;
            this.groundTruth[this.rows - 1][j] = CellType.WALL;
        }
        // Top row zones
        this.addRect(10, 10, 30, 35);     // Workshop (row 10-39, col 10-44)
        this.addRect(10, 55, 30, 40);     // Material Space (row 10-39, col 55-94)
        this.addRect(10, 110, 20, 30);    // Control Room (row 10-29, col 110-139)

        // Middle-right zone
        this.addRect(40, 100, 25, 40);    // AGV's Station (row 40-64, col 100-139)

        // Bottom row zones - SEPARATED
        this.addRect(70, 10, 22, 35);     // Supply Area (row 70-91, col 10-44)
        this.addRect(70, 55, 22, 40);     // Shipping & EXIT (row 70-91, col 55-94)
    }

    private addRect(r: number, c: number, h: number, w: number) {
        for (let i = r; i < r + h && i < this.rows; i++) {
            for (let j = c; j < c + w && j < this.cols; j++) {
                if (i === r || i === r + h - 1 || j === c || j === c + w - 1) {
                    this.groundTruth[i][j] = CellType.WALL;
                }
            }
        }
    }

    scan() {
        const numRays = 360;
        const maxRange = 60;
        for (let i = 0; i < numRays; i++) {
            const angle = (i * (360 / numRays)) * (Math.PI / 180);
            for (let r = 0; r < maxRange; r += 0.5) {
                const rx = Math.floor(this.agvPos.x + r * Math.cos(angle));
                const ry = Math.floor(this.agvPos.y + r * Math.sin(angle));
                if (rx < 0 || rx >= this.cols || ry < 0 || ry >= this.rows) break;
                if (this.groundTruth[ry][rx] === CellType.WALL) {
                    this.grid[ry][rx] = CellType.WALL;
                    break;
                } else {
                    this.grid[ry][rx] = CellType.FREE;
                }
            }
        }
    }

    revealFullMap() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = this.groundTruth[r][c];
            }
        }
    }

    move(dx: number, dy: number) {
        const nextX = this.agvPos.x + dx;
        const nextY = this.agvPos.y + dy;
        const ix = Math.round(nextX);
        const iy = Math.round(nextY);
        if (ix >= 0 && ix < this.cols && iy >= 0 && iy < this.rows) {
            if (this.groundTruth[iy][ix] !== CellType.WALL) {
                this.agvPos.x = nextX;
                this.agvPos.y = nextY;
                if (dx !== 0 || dy !== 0) this.agvAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                this.scan();
                return true;
            }
        }
        return false;
    }
}
