/**
 * Template Generator Worker
 * Processes a batch of schemas in a separate thread
 */

const { workerData, parentPort } = require('worker_threads');
const path = require('path');
const fs = require('fs');

// Import the compiled schema parser and generator modules
let schemaParser;
let generator;
let templateGenerator;

// Load the template generator modules
try {
  // Load compiled modules from dist directory
  schemaParser = require('./dist/cli/lib/schema-parser');
  generator = require('./dist/cli/lib/generator');
} catch (error) {
  parentPort.postMessage({
    type: 'log',
    text: `Error loading modules: ${error.message}. Make sure you've run 'pnpm build:cli' first.`
  });
  process.exit(1);
}

// Schema cache to avoid parsing the same schema multiple times
const schemaCache = new Map();

// Process a schema and generate a template
async function processSchema(schemaFile, schemaDir, outputDir, templatesDir) {
  try {
    const schemaPath = path.join(schemaDir, schemaFile);
    const outputPath = path.join(outputDir, schemaFile.replace('.json', '.html'));
    
    // Read and parse the schema file
    let parsedSchema;
    if (schemaCache.has(schemaPath)) {
      // Use cached schema if available
      parsedSchema = schemaCache.get(schemaPath);
    } else {
      // Read the schema file
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(schemaContent);
      
      // Parse the schema
      parsedSchema = schemaParser.parseSchema(schema);
      
      // Cache the parsed schema
      schemaCache.set(schemaPath, parsedSchema);
    }
    
    // Generate the HTML template
    const html = generator.generateTemplate(parsedSchema, templatesDir);
    
    // Create output directory if it doesn't exist
    const outputFileDir = path.dirname(outputPath);
    if (!fs.existsSync(outputFileDir)) {
      fs.mkdirSync(outputFileDir, { recursive: true });
    }
    
    // Write the output file
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    // Report progress
    parentPort.postMessage({ type: 'progress' });
    
    return true;
  } catch (error) {
    parentPort.postMessage({
      type: 'log',
      text: `Error processing ${schemaFile}: ${error.message}`
    });
    return false;
  }
}

// Main worker function
async function processSchemas() {
  const { batch, schemaDir, outputDir, templatesDir } = workerData;
  
  parentPort.postMessage({
    type: 'log',
    text: `Worker started - processing ${batch.length} schemas`
  });
  
  // Process each schema in the batch
  const results = [];
  for (const schemaFile of batch) {
    const result = await processSchema(schemaFile, schemaDir, outputDir, templatesDir);
    results.push(result);
  }
  
  // Count successful generations
  const successful = results.filter(result => result).length;
  
  parentPort.postMessage({
    type: 'log',
    text: `Worker completed - processed ${successful}/${batch.length} schemas successfully`
  });
}

// Execute the processing and handle errors
processSchemas().catch(error => {
  parentPort.postMessage({
    type: 'log',
    text: `Worker error: ${error.message}`
  });
}); 