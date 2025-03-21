#!/usr/bin/env node

/**
 * Batch Template Generator
 * 
 * Generates templates for multiple JSON schemas in parallel using worker threads
 * This significantly improves performance when working with hundreds of schemas
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { Command } = require('commander');

// Configure command line options
const program = new Command();
program
  .description('Generate HTML templates from JSON schemas in parallel')
  .option('-s, --schema-dir <dir>', 'Directory containing JSON schemas', 'src/test-schemas')
  .option('-o, --output-dir <dir>', 'Output directory for generated templates', 'test-output')
  .option('-b, --batch-size <size>', 'Number of schemas per batch', '10')
  .option('-w, --max-workers <count>', 'Maximum number of worker threads', String(require('os').cpus().length))
  .option('-t, --templates-dir <dir>', 'Directory containing Mustache templates', 'src/template-generator/templates')
  .parse(process.argv);

const options = program.opts();

// Input validation
if (!fs.existsSync(options.schemaDir)) {
  console.error(`Error: Schema directory '${options.schemaDir}' does not exist.`);
  process.exit(1);
}

if (!fs.existsSync(options.templatesDir)) {
  console.error(`Error: Templates directory '${options.templatesDir}' does not exist.`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(options.outputDir)) {
  console.log(`Creating output directory: ${options.outputDir}`);
  fs.mkdirSync(options.outputDir, { recursive: true });
}

// Convert options to appropriate types
const batchSize = parseInt(options.batchSize, 10);
const maxWorkers = parseInt(options.maxWorkers, 10);

console.log('\n--- Batch Template Generator ---');
console.log(`Schema directory: ${options.schemaDir}`);
console.log(`Templates directory: ${options.templatesDir}`);
console.log(`Output directory: ${options.outputDir}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Max workers: ${maxWorkers}`);
console.log('--------------------------------\n');

// Compile TypeScript files before starting workers
try {
  console.log('Compiling TypeScript files...');
  const { execSync } = require('child_process');
  execSync('pnpm build:cli', { stdio: 'inherit' });
  console.log('TypeScript compilation complete.\n');
} catch (error) {
  console.error('Error compiling TypeScript files:', error.message);
  process.exit(1);
}

/**
 * Main function to batch generate templates
 */
async function batchGenerateTemplates() {
  // Get all JSON schema files
  const schemaFiles = fs.readdirSync(options.schemaDir)
    .filter(file => file.endsWith('.json'));
  
  console.log(`Found ${schemaFiles.length} JSON schema files`);
  
  // Split schemas into batches
  const batches = [];
  for (let i = 0; i < schemaFiles.length; i += batchSize) {
    batches.push(schemaFiles.slice(i, i + batchSize));
  }
  
  console.log(`Split into ${batches.length} batches with max ${batchSize} schemas per batch`);
  
  // Process batches with workers
  let completedBatches = 0;
  let processedSchemas = 0;
  let startTime = Date.now();
  
  // Track active workers
  const activeWorkers = new Set();
  
  // Process each batch with a worker
  return new Promise((resolve, reject) => {
    let batchIndex = 0;
    
    // Function to start a new worker
    const startWorker = () => {
      if (batchIndex >= batches.length) {
        // No more batches to process
        return;
      }
      
      // Create worker with batch data
      const worker = new Worker('./templateWorker.js', {
        workerData: {
          batch: batches[batchIndex],
          schemaDir: options.schemaDir,
          outputDir: options.outputDir,
          templatesDir: options.templatesDir
        }
      });
      
      const currentBatchIndex = batchIndex++;
      activeWorkers.add(worker);
      
      // Handle worker messages
      worker.on('message', (message) => {
        if (message.type === 'log') {
          console.log(`[Worker ${currentBatchIndex + 1}/${batches.length}] ${message.text}`);
        } else if (message.type === 'progress') {
          processedSchemas++;
          const percent = Math.floor((processedSchemas / schemaFiles.length) * 100);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\rProgress: ${processedSchemas}/${schemaFiles.length} schemas (${percent}%) in ${elapsed}s`);
        }
      });
      
      // Handle worker completion
      worker.on('exit', (code) => {
        activeWorkers.delete(worker);
        completedBatches++;
        
        if (code !== 0) {
          console.error(`Worker for batch ${currentBatchIndex + 1}/${batches.length} exited with code ${code}`);
        }
        
        // Start a new worker if there are more batches
        startWorker();
        
        // If all batches are completed, resolve the promise
        if (completedBatches === batches.length) {
          const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`\n\nAll batches completed in ${totalTime}s`);
          resolve();
        }
      });
      
      // Handle worker error
      worker.on('error', (err) => {
        console.error(`Worker error in batch ${currentBatchIndex + 1}/${batches.length}: ${err}`);
        reject(err);
      });
    };
    
    // Start initial workers (up to maxWorkers)
    const initialWorkerCount = Math.min(maxWorkers, batches.length);
    for (let i = 0; i < initialWorkerCount; i++) {
      startWorker();
    }
  });
}

// Execute the batch generation
batchGenerateTemplates()
  .then(() => {
    console.log('Template generation completed successfully');
  })
  .catch((err) => {
    console.error('Error generating templates:', err);
    process.exit(1);
  }); 