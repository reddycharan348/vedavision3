import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * ESP32-CAM Image Upload Endpoint
 * Receives raw binary image data and triggers VedaVision analysis.
 */
export async function POST(req) {
    try {
        const { searchParams } = new URL(req.url);
        const shouldAnalyze = searchParams.get('analyze') !== 'false';
        console.log(`[IoT Upload] URL: ${req.url} - shouldAnalyze: ${shouldAnalyze}`);

        const body = await req.arrayBuffer();
        if (!body || body.byteLength === 0) {
            return NextResponse.json({ error: "No image data received" }, { status: 400 });
        }

        const buffer = Buffer.from(body);

        // 1. Ensure the IoT directory exists
        const iotDir = path.join(process.cwd(), 'public', 'iot');
        await fs.mkdir(iotDir, { recursive: true });

        // 2. Save the image
        const imagePath = path.join(iotDir, 'specimen.jpg');
        await fs.writeFile(imagePath, buffer);

        let result = null;
        if (shouldAnalyze) {
            // 3. Trigger the analysis logic (internal fetch to our own analyze API)
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

            // Convert the buffer to base64 for the analyze API
            const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

            const analysisResponse = await fetch(`${appUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });

            result = await analysisResponse.json();
        }

        // 4. Save the status for the dashboard to read
        const statusPath = path.join(iotDir, 'status.json');
        
        let existingResult = null;
        try {
            const existing = await fs.readFile(statusPath, 'utf8');
            existingResult = JSON.parse(existing).result;
        } catch (e) {}

        const statusData = {
            lastUpdated: new Date().toISOString(),
            imagePath: '/iot/specimen.jpg',
            result: shouldAnalyze ? result : existingResult,
            isNew: shouldAnalyze
        };
        await fs.writeFile(statusPath, JSON.stringify(statusData, null, 2));

        return NextResponse.json({
            success: true,
            message: shouldAnalyze ? "IoT Specimen Received & Analyzed" : "Frame Updated",
            identification: (shouldAnalyze ? result : existingResult)?.identification?.name
        });

    } catch (error) {
        console.error("IoT Upload Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
