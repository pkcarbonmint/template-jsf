#!/usr/bin/env node

/**
 * Batch Template Generator
 * 
 * This script processes multiple schema files in parallel using worker threads,
 * significantly improving the performance of template generation when dealing with
 * many schema files.
 */

const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const { program } = require('commander');

// Parse command line arguments
program
  .option('-s, --schemas <dir>', 'Directory containing JSON schema files', './src/test-schemas')
  .option('-o, --output <dir>', 'Output directory for generated templates', './test-output')
  .option('-b, --batch-size <number>', 'Number of schemas to process in a batch', '5')
  .option('-w, --workers <number>', 'Maximum number of worker threads', '4')
  .option('-t, --templates <dir>', 'Directory containing template files', './src/template-generator/templates')
  .parse(process.argv);

const options = program.opts();

// Validate input
if (!fs.existsSync(options.schemas)) {
  console.error(`Schema directory not found: ${options.schemas}`);
  process.exit(1);
}

if (!fs.existsSync(options.templates)) {
  console.error(`Templates directory not found: ${options.templates}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
if (!fs.existsSync(options.output)) {
  fs.mkdirSync(options.output, { recursive: true });
}

const batchSize = parseInt(options.batchSize, 10);
const maxWorkers = parseInt(options.workers, 10);

console.log('Batch Template Generator');
console.log('----------------------');
console.log(`Schema directory: ${options.schemas}`);
console.log(`Output directory: ${options.output}`);
console.log(`Templates directory: ${options.templates}`);
console.log(`Batch size: ${batchSize}`);
console.log(`Max workers: ${maxWorkers}`);
console.log('');

// Function to process schemas in batches
async function batchGenerateTemplates() {
  // Read all JSON schema files
  const schemaFiles = fs.readdirSync(options.schemas)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(options.schemas, file));
  
  console.log(`Found ${schemaFiles.length} schema files`);
  
  // Split schemas into batches
  const batches = [];
  for (let i = 0; i < schemaFiles.length; i += batchSize) {
    batches.push(schemaFiles.slice(i, i + batchSize));
  }
  
  console.log(`Split into ${batches.length} batches`);
  
  let completedSchemas = 0;
  let failedSchemas = 0;
  
  // Process batches with a limited number of workers
  let activeBatches = 0;
  let batchIndex = 0;
  const activeWorkers = new Set();
  
  return new Promise((resolve, reject) => {
    // Function to start a worker for a batch
    function startWorkerForBatch(batch) {
      activeBatches++;
      
      const worker = new Worker(path.join(__dirname, 'worker.js'), {
        workerData: {
          schemaFiles: batch,
          outputDir: options.output,
          templatesDir: options.templates
        }
      });
      
      activeWorkers.add(worker);
      
      worker.on('message', (message) => {
        if (message.type === 'progress') {
          completedSchemas++;
          process.stdout.write(`\rProcessed ${completedSchemas + failedSchemas}/${schemaFiles.length} schemas... (${Math.round((completedSchemas + failedSchemas) / schemaFiles.length * 100)}%)`);
        } else if (message.type === 'error') {
          failedSchemas++;
          console.error(`\nError processing schema: ${message.schemaFile}`);
          console.error(message.error);
        }
      });
      
      worker.on('error', (error) => {
        console.error(`\nWorker error: ${error}`);
        failedSchemas += batch.length;
        
        activeWorkers.delete(worker);
        activeBatches--;
        
        if (activeBatches === 0 && batchIndex >= batches.length) {
          finishProcessing();
        } else {
          processNextBatch();
        }
      });
      
      worker.on('exit', (code) => {
        activeWorkers.delete(worker);
        activeBatches--;
        
        if (code !== 0) {
          console.error(`\nWorker stopped with exit code ${code}`);
        }
        
        if (activeBatches === 0 && batchIndex >= batches.length) {
          finishProcessing();
        } else {
          processNextBatch();
        }
      });
    }
    
    // Process the next batch
    function processNextBatch() {
      while (activeBatches < maxWorkers && batchIndex < batches.length) {
        startWorkerForBatch(batches[batchIndex++]);
      }
    }
    
    // Finish processing and report results
    function finishProcessing() {
      console.log(`\n\nCompleted processing ${schemaFiles.length} schemas`);
      console.log(`- Successfully generated: ${completedSchemas} templates`);
      console.log(`- Failed: ${failedSchemas} schemas`);
      
      if (failedSchemas > 0) {
        reject(new Error(`Failed to process ${failedSchemas} schemas`));
      } else {
        resolve();
      }
    }
    
    // Start initial batch processing
    processNextBatch();
  });
}

batchGenerateTemplates()
  .then(() => {
    console.log('Batch processing completed successfully');
  })
  .catch(error => {
    console.error('Batch processing completed with errors:', error.message);
    process.exit(1);
  }); 