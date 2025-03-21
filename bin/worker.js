/**
 * Worker script for batch template generation
 * 
 * This worker processes a batch of schema files and generates HTML templates.
 */

const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { parseSchema } = require('../dist/template-generator/lib/schema-parser');
const { generateTemplateAsync } = require('../dist/template-generator/lib/generator');

async function processSchemaFile(schemaFile, outputDir, templatesDir) {
  try {
    // Read schema file
    const schemaContent = fs.readFileSync(schemaFile, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Parse schema
    const parsedSchema = parseSchema(schema);
    
    // Generate template
    const html = await generateTemplateAsync(parsedSchema, templatesDir);
    
    // Write template to output directory
    const outputFilename = path.basename(schemaFile, '.json') + '.html';
    const outputPath = path.join(outputDir, outputFilename);
    
    fs.writeFileSync(outputPath, html, 'utf-8');
    
    // Report progress
    parentPort.postMessage({
      type: 'progress',
      schemaFile: schemaFile
    });
  } catch (error) {
    // Report error
    parentPort.postMessage({
      type: 'error',
      schemaFile: schemaFile,
      error: error.message
    });
  }
}

async function processBatch() {
  const { schemaFiles, outputDir, templatesDir } = workerData;
  
  try {
    // Process each schema file in the batch
    for (const schemaFile of schemaFiles) {
      await processSchemaFile(schemaFile, outputDir, templatesDir);
    }
  } catch (error) {
    console.error('Error processing batch:', error);
    process.exit(1);
  }
}

// Start processing
processBatch()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Worker error:', error);
    process.exit(1);
  }); 