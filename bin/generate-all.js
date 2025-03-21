#!/usr/bin/env node

/**
 * Generates templates for all JSON schemas in the test-schemas directory
 * 
 * Usage:
 * node bin/generate-all.js [--output-dir=<directory>]
 * 
 * Options:
 *   --output-dir    Specify a custom output directory (default: ../generated-templates)
 *   --help          Show this help message
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
let outputDirArg = null;

for (const arg of args) {
  if (arg === '--help' || arg === '-h') {
    console.log(`
JSON Schema Form Template Generator
-----------------------------------
Generates HTML templates for all JSON schemas in the src/test-schemas directory.

Usage:
  node bin/generate-all.js [--output-dir=<directory>]

Options:
  --output-dir=<dir>  Specify a custom output directory (default: ../generated-templates)
  --help, -h          Show this help message
`);
    process.exit(0);
  } else if (arg.startsWith('--output-dir=')) {
    outputDirArg = arg.substring('--output-dir='.length);
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

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  console.log(`Creating output directory: ${OUTPUT_DIR}`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all JSON schema files
const schemaFiles = fs.readdirSync(SCHEMAS_DIR)
  .filter(file => file.endsWith('.json'));

console.log(`\nFound ${schemaFiles.length} schema files to process`);

// Process each schema file
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