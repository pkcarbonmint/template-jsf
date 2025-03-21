#!/usr/bin/env node

/**
 * Generates templates for all JSON schemas in the test-schemas directory
 * 
 * Usage:
 * node bin/generate-all.js [--schema-dir=<directory>] [--output-dir=<directory>] [--parallel] [--workers=<number>] [--batch-size=<number>]
 * 
 * Options:
 *   --schema-dir     Specify the source schema directory (default: src/test-schemas)
 *   --output-dir     Specify a custom output directory (default: ../generated-templates)
 *   --parallel       Use parallel processing for better performance (recommended for many schemas)
 *   --workers        Number of worker threads for parallel processing (default: CPU count)
 *   --batch-size     Number of schemas per batch in parallel mode (default: 10)
 *   --help           Show this help message
 */

const path = require('path');
const { exec, execSync } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const fs = require('fs');
const fsPromises = fs.promises;
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
let outputDirArg = null;
let schemaDirArg = null;
let useParallel = false;
let workers = os.cpus().length;
let batchSize = 10;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    console.log(`
JSON Schema Form Template Generator
-----------------------------------
Generates HTML templates for all JSON schemas in the specified schema directory.

Usage:
  node bin/generate-all.js [options]

Options:
  --schema-dir=<dir>    Specify the source schema directory (default: src/test-schemas)
  --output-dir=<dir>    Specify a custom output directory (default: ../generated-templates)
  --parallel            Use parallel processing for better performance (recommended for many schemas)
  --workers=<number>    Number of worker threads for parallel processing (default: CPU count)
  --batch-size=<number> Number of schemas per batch in parallel mode (default: 10)
  --help, -h            Show this help message
`);
    process.exit(0);
  } else if (arg.startsWith('--output-dir=')) {
    outputDirArg = arg.substring('--output-dir='.length);
  } else if (arg.startsWith('--schema-dir=')) {
    schemaDirArg = arg.substring('--schema-dir='.length);
  } else if (arg === '--parallel') {
    useParallel = true;
  } else if (arg.startsWith('--workers=')) {
    workers = parseInt(arg.substring('--workers='.length), 10);
  } else if (arg.startsWith('--batch-size=')) {
    batchSize = parseInt(arg.substring('--batch-size='.length), 10);
  }
}

// Configuration
const SCHEMAS_DIR = schemaDirArg 
  ? path.resolve(schemaDirArg)
  : path.join(__dirname, '../src/test-schemas');
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

// Process all schemas in parallel using the batchGenerate script
async function processInParallel(schemaFiles) {
  const startTime = Date.now();
  
  // Execute the batch generation script
  const batchGenScript = path.join(__dirname, '../batchGenerate.js');
  
  try {
    console.log(`\nStarting parallel generation with ${workers} workers...`);
    const command = `node ${batchGenScript} -s "${SCHEMAS_DIR}" -o "${OUTPUT_DIR}" -b ${batchSize} -w ${workers}`;
    
    // Execute the command asynchronously and display output
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.error("Command stderr:", stderr);
    }
    
    console.log(stdout);
    
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
    const generatedCount = await countGeneratedFiles(schemaFiles);
    console.log(`Generated files: ${generatedCount}/${schemaFiles.length}`);
    
    return generatedCount === schemaFiles.length;
  } catch (error) {
    console.error('Error during parallel generation:', error.message);
    throw error;
  }
}

// Process all schemas sequentially (original implementation)
async function processSequentially(schemaFiles) {
  let successCount = 0;
  let failCount = 0;
  const results = [];
  
  for (let index = 0; index < schemaFiles.length; index++) {
    const schemaFile = schemaFiles[index];
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));
    
    console.log(`\n[${index + 1}/${schemaFiles.length}] Processing: ${schemaFile}`);
    
    const startTime = Date.now();
    
    try {
      // Generate template using the existing script
      const command = `node ${path.join(__dirname, 'generate-template.js')} -s "${schemaPath}" -o "${outputPath}"`;
      
      const { stdout } = await execAsync(command);
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Get the size of the output file
      const stats = await fsPromises.stat(outputPath);
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
  }
  
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
  
  return failCount === 0;
}

// Count how many output files were successfully generated
async function countGeneratedFiles(schemaFiles) {
  let count = 0;
  
  for (const schemaFile of schemaFiles) {
    const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));
    try {
      await fsPromises.access(outputPath);
      count++;
    } catch (error) {
      // File doesn't exist
    }
  }
  
  return count;
}

// Main function to run the program
async function main() {
  try {
    try {
      await fsPromises.access(OUTPUT_DIR);
    } catch (error) {
      console.log(`Creating output directory: ${OUTPUT_DIR}`);
      await fsPromises.mkdir(OUTPUT_DIR, { recursive: true });
    }

    // Get all JSON schema files
    const dirFiles = await fsPromises.readdir(SCHEMAS_DIR);
    const schemaFiles = dirFiles.filter(file => file.endsWith('.json'));

    console.log(`\nFound ${schemaFiles.length} schema files to process`);

    // Use parallel or sequential processing based on configuration
    let success;
    if (useParallel) {
      success = await processInParallel(schemaFiles);
    } else {
      success = await processSequentially(schemaFiles);
    }

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 