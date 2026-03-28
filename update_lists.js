import fs from 'fs';
import path from 'path';

function updateList(folderName, arrayName, outputFile) {
    const dir = path.join(process.cwd(), 'app', 'data', folderName);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
    
    const items = [];
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
            const data = JSON.parse(content);
            const id = data.plant_id || data.id || file.replace('.json', '');
            const name = data.summary?.name || id;
            const scientific = data.summary?.scientific_name || '';
            const desc = data.summary?.family || '';
            const image = data.image || `/images/${folderName}/${id}.jpg`;
            
            items.push({
                id,
                name,
                scientific,
                desc,
                image
            });
        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    }
    
    const fileContent = `export const ${arrayName} = ${JSON.stringify(items, null, 4)};\n`;
    fs.writeFileSync(path.join(process.cwd(), 'app', 'data', outputFile), fileContent, 'utf-8');
    console.log(`Updated ${outputFile} with ${items.length} items.`);
}

updateList('cereals', 'featuredCereals', 'cerealsList.js');
updateList('pulses', 'featuredPulses', 'pulsesList.js');
updateList('plants', 'featuredPlants', 'plantsList.js');
