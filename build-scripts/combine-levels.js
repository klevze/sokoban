import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const sourceDir = path.resolve(__dirname, '../src/js/levels');
const destDir = path.resolve(__dirname, '../src/assets/level');
const outputFile = path.join(destDir, 'levels.json');

console.log(`Looking for level files in: ${sourceDir}`);

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Find all level JSON files directly with fs instead of using glob
let levelFiles = [];
try {
  const files = fs.readdirSync(sourceDir);
  levelFiles = files
    .filter(file => file.match(/^level\d+\.json$/))
    .map(file => path.join(sourceDir, file))
    .sort((a, b) => {
      // Extract level numbers for proper sorting (level01.json, level02.json, etc.)
      const numA = parseInt(path.basename(a).match(/level(\d+)\.json/)[1]);
      const numB = parseInt(path.basename(b).match(/level(\d+)\.json/)[1]);
      return numA - numB;
    });
} catch (error) {
  console.error(`Error reading directory ${sourceDir}: ${error.message}`);
  process.exit(1);
}

if (levelFiles.length === 0) {
  console.error('No level files found!');
  process.exit(1);
}

console.log(`Found ${levelFiles.length} level files to combine`);

// Read each file and combine into an array
const levels = levelFiles.map((file, index) => {
  try {
    // Read the file content
    const fileContent = fs.readFileSync(file, 'utf8');
    
    try {
      // Parse the JSON, handle common issues
      let levelData = JSON.parse(fileContent.trim());
      
      // Add level number metadata if not present
      levelData.levelNumber = index + 1;
      
      console.log(`Processed: ${path.basename(file)}`);
      return levelData;
    } catch (parseError) {
      // Try to fix common JSON syntax issues
      console.error(`JSON parse error in ${path.basename(file)}: ${parseError.message}`);
      console.error('Skipping this level due to JSON syntax error');
      return null;
    }
  } catch (error) {
    console.error(`Error reading file ${file}: ${error.message}`);
    return null;
  }
}).filter(Boolean); // Remove any nulls from failed processing

if (levels.length === 0) {
  console.error('Failed to process any level files!');
  process.exit(1);
}

// Calculate original size for comparison
const prettyJson = JSON.stringify(levels, null, 2);
const prettySize = Buffer.byteLength(prettyJson, 'utf8') / 1024;

// Validate the result before writing to file
try {
  // Output the levels array directly without pretty-printing (minified)
  const minifiedJson = JSON.stringify(levels);
  
  // Test if the result can be parsed as JSON
  JSON.parse(minifiedJson); // Should not throw an error if valid JSON
  
  // Write the minified JSON to the output file
  fs.writeFileSync(outputFile, minifiedJson);
  
  // Calculate the minified size
  const minifiedSize = Buffer.byteLength(minifiedJson, 'utf8') / 1024;
  
  console.log(`Successfully created minified levels file at: ${outputFile}`);
  console.log(`Total levels included: ${levels.length}`);
  console.log(`File size reduced from ${prettySize.toFixed(2)} KB to ${minifiedSize.toFixed(2)} KB (${((1 - minifiedSize/prettySize) * 100).toFixed(2)}% reduction)`);
} catch (error) {
  console.error(`Error creating combined file: ${error.message}`);
  process.exit(1);
}