import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import './SheetView.css';

interface SheetViewProps {
    zoneName: string;
    zoneColor: string;
    sheetId: string;
    gid: string;
    onBack: () => void;
}

// Parse CSV string into 2D array
const parseCSV = (csv: string): string[][] => {
    const lines = csv.split('\n');
    return lines.map(line => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }).filter(row => row.some(cell => cell !== ''));
};

function SheetView({ zoneName, zoneColor, sheetId, gid, onBack }: SheetViewProps) {
    const [data, setData] = useState<string[][]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSheetData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Use multiple CORS proxies for redundancy
            const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

            // Try multiple proxy options with timeout
            const proxyOptions = [
                `https://api.allorigins.win/raw?url=${encodeURIComponent(sheetUrl)}`,
                `https://corsproxy.io/?${encodeURIComponent(sheetUrl)}`,
                `https://thingproxy.freeboard.io/fetch/${sheetUrl}`,
            ];

            let csvText = '';
            let lastError: Error | null = null;

            for (const proxyUrl of proxyOptions) {
                try {
                    // Add timeout using AbortController
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

                    const response = await fetch(proxyUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const text = await response.text();
                        // Check if we got actual CSV data (not an error page)
                        if (text && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
                            csvText = text;
                            break;
                        }
                    }
                } catch (err) {
                    if (err instanceof Error && err.name === 'AbortError') {
                        lastError = new Error('Request timed out');
                    } else {
                        lastError = err instanceof Error ? err : new Error('Fetch failed');
                    }
                }
            }

            if (!csvText && lastError) {
                throw lastError;
            }

            if (!csvText) {
                throw new Error('Failed to fetch sheet data. Please check if the sheet is publicly accessible.');
            }

            const parsedData = parseCSV(csvText);
            setData(parsedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sheet data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSheetData();
    }, [sheetId, gid]);

    return (
        <div className="sheet-view">
            <div className="sheet-header">
                <button className="back-button" onClick={onBack}>
                    <ArrowLeft size={20} />
                    <span>Back to Map</span>
                </button>
                <h2 className="sheet-title" style={{ color: zoneColor }}>
                    {zoneName}
                </h2>
                <button className="refresh-button" onClick={fetchSheetData} disabled={loading}>
                    <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                    <span>Refresh</span>
                </button>
            </div>

            <div className="sheet-content">
                {loading && (
                    <div className="sheet-loading">
                        <RefreshCw size={32} className="spinning" />
                        <span>Loading sheet data...</span>
                    </div>
                )}

                {error && (
                    <div className="sheet-error">
                        <AlertCircle size={32} />
                        <span>{error}</span>
                        <button onClick={fetchSheetData}>Try Again</button>
                    </div>
                )}

                {!loading && !error && data.length > 0 && (
                    <div className="table-container">
                        <table className="sheet-table">
                            <thead>
                                <tr>
                                    {data[0].map((header, idx) => (
                                        <th key={idx}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.slice(1).map((row, rowIdx) => (
                                    <tr key={rowIdx}>
                                        {row.map((cell, cellIdx) => (
                                            <td key={cellIdx}>{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && !error && data.length === 0 && (
                    <div className="sheet-empty">
                        <span>No data found in this sheet</span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SheetView;
