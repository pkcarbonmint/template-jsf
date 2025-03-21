#!/usr/bin/env node

/**
 * Generates templates for all JSON schemas in the test-schemas directory
 * 
 * Usage:
 * node bin/generate-all.js [--output-dir=<directory>] [--parallel] [--workers=<number>] [--batch-size=<number>]
 * 
 * Options:
 *   --output-dir    Specify a custom output directory (default: ../generated-templates)
 *   --parallel      Use parallel processing for better performance (recommended for many schemas)
 *   --workers       Number of worker threads for parallel processing (default: CPU count)
 *   --batch-size    Number of schemas per batch in parallel mode (default: 10)
 *   --help          Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
let outputDirArg = null;
let useParallel = false;
let workers = os.cpus().length;
let batchSize = 10;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    console.log(`
JSON Schema Form Template Generator
-----------------------------------
Generates HTML templates for all JSON schemas in the src/test-schemas directory.

Usage:
  node bin/generate-all.js [options]

Options:
  --output-dir=<dir>    Specify a custom output directory (default: ../generated-templates)
  --parallel            Use parallel processing for better performance (recommended for many schemas)
  --workers=<number>    Number of worker threads for parallel processing (default: CPU count)
  --batch-size=<number> Number of schemas per batch in parallel mode (default: 10)
  --help, -h            Show this help message
`);
    process.exit(0);
  } else if (arg.startsWith('--output-dir=')) {
    outputDirArg = arg.substring('--output-dir='.length);
  } else if (arg === '--parallel') {
    useParallel = true;
  } else if (arg.startsWith('--workers=')) {
    workers = parseInt(arg.substring('--workers='.length), 10);
  } else if (arg.startsWith('--batch-size=')) {
    batchSize = parseInt(arg.substring('--batch-size='.length), 10);
  }
}

// Configuration
const SCHEMAS_DIR = path.join(__dirname, '../src/test-schemas');
const OUTPUT_DIR = outputDirArg 
  ? path.resolve(outputDirArg)
  : path.join(__dirname, '../generated-templates');

// Print banner
console.log(`
┌────────────────────────────────────────────────┐
│ JSON Schema Form Template Generator            │
└────────────────────────────────────────────────┘
`);

console.log(`Schemas directory: ${SCHEMAS_DIR}`);
console.log(`Output directory: ${OUTPUT_DIR}`);
console.log(`Processing mode: ${useParallel ? 'Parallel' : 'Sequential'}`);
if (useParallel) {
  console.log(`Worker threads: ${workers}`);
  console.log(`Batch size: ${batchSize}`);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  console.log(`Creating output directory: ${OUTPUT_DIR}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all JSON schema files
const schemaFiles = fs.readdirSync(SCHEMAS_DIR)
  .filter(file => file.endsWith('.json'));

console.log(`\nFound ${schemaFiles.length} schema files to process`);

// Use parallel or sequential processing based on configuration
if (useParallel) {
  processInParallel(schemaFiles);
} else {
  processSequentially(schemaFiles);
}

// Process all schemas in parallel using the batchGenerate script
function processInParallel(schemaFiles) {
  const startTime = Date.now();
  
  // Execute the batch generation script
  const batchGenScript = path.join(__dirname, '../batchGenerate.js');
  
  try {
    console.log(`\nStarting parallel generation with ${workers} workers...`);
    const command = `node ${batchGenScript} -s "${SCHEMAS_DIR}" -o "${OUTPUT_DIR}" -b ${batchSize} -w ${workers}`;
    
    // Execute the command and display output in real-time
    const result = execSync(command, { encoding: 'utf8' });
    console.log(result);
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n┌────────────────────────────────────────────────┐');
    console.log('│ Generation Summary                             │');
    console.log('└────────────────────────────────────────────────┘');
    console.log(`Total schemas: ${schemaFiles.length}`);
    console.log(`Processing time: ${totalDuration.toFixed(2)}s`);
    console.log(`Average time per schema: ${(totalDuration / schemaFiles.length).toFixed(2)}s`);
    console.log(`Processing mode: Parallel (${workers} workers, batch size: ${batchSize})`);
    
    // Verify all files were generated
    const generatedCount = countGeneratedFiles(schemaFiles);
    console.log(`Generated files: ${generatedCount}/${schemaFiles.length}`);
    
    process.exit(generatedCount === schemaFiles.length ? 0 : 1);
  } catch (error) {
    console.error('Error during parallel generation:', error.message);
    process.exit(1);
  }
}

// Process all schemas sequentially (original implementation)
function processSequentially(schemaFiles) {
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  schemaFiles.forEach((schemaFile, index) => {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));
    
    console.log(`\n[${index + 1}/${schemaFiles.length}] Processing: ${schemaFile}`);
    
    const startTime = Date.now();
    
    try {
      // Generate template using the existing script
      const command = `node ${path.join(__dirname, 'generate-template.js')} -s "${schemaPath}" -o "${outputPath}"`;
      
      execSync(command, { encoding: 'utf8' });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Get the size of the output file
      const stats = fs.statSync(outputPath);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ Success: ${schemaFile} → ${path.relative(process.cwd(), outputPath)}`);
      console.log(`   Time: ${duration.toFixed(2)}s | Size: ${fileSizeKB} KB`);
      
      successCount++;
      results.push({
        schema: schemaFile,
        output: path.relative(process.cwd(), outputPath),
        success: true,
        duration,
        size: fileSizeKB
      });
    } catch (error) {
      console.error(`❌ Error processing ${schemaFile}:`, error.message);
      
      failCount++;
      results.push({
        schema: schemaFile,
        success: false,
        error: error.message
      });
    }
  });
  
  console.log('\n┌────────────────────────────────────────────────┐');
  console.log('│ Generation Summary                             │');
  console.log('└────────────────────────────────────────────────┘');
  console.log(`Total schemas: ${schemaFiles.length}`);
  console.log(`Succeeded: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (successCount > 0) {
    console.log('\nSuccessful generations:');
    console.log('┌───────────────────┬──────────┬───────────┐');
    console.log('│ Schema            │ Time (s) │ Size (KB) │');
    console.log('├───────────────────┼──────────┼───────────┤');
    
    results.filter(r => r.success).forEach(result => {
      const name = result.schema.padEnd(17).substring(0, 17);
      const time = result.duration.toFixed(2).padStart(8);
      const size = result.size.padStart(9);
      console.log(`│ ${name} │ ${time} │ ${size} │`);
    });
    
    console.log('└───────────────────┴──────────┴───────────┘');
  }
  
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Count how many output files were successfully generated
function countGeneratedFiles(schemaFiles) {
  let count = 0;
  
  schemaFiles.forEach(schemaFile => {
    const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));
    if (fs.existsSync(outputPath)) {
      count++;
    }
  });
  
  return count;
} 