#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { parseSchema } from './lib/schema-parser';
import { generateTemplate } from './lib/generator';

// Configure command line options
const program = new Command();
program
  .requiredOption('-s, --schema <path>', 'Path to the JSON schema file')
  .requiredOption('-o, --output <path>', 'Path to the output HTML file')
  .option('-t, --templates <path>', 'Path to the Mustache templates directory', path.join(__dirname, 'templates'))
  .parse(process.argv);

const options = program.opts();

// Validate inputs
if (!fs.existsSync(options.schema)) {
  console.error(`Error: Schema file not found: ${options.schema}`);
  process.exit(1);
}

if (!fs.existsSync(options.templates)) {
  console.error(`Error: Templates directory not found: ${options.templates}`);
  process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.dirname(options.output);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate the template
try {
  // Read the schema file
  const schemaContent = fs.readFileSync(options.schema, 'utf-8');
  const schema = JSON.parse(schemaContent);
  
  // Parse the schema
  const parsedSchema = parseSchema(schema);
  
  // Generate the template
  const html = generateTemplate(parsedSchema, options.templates);
  
  // Write the output file
  fs.writeFileSync(options.output, html, 'utf-8');
  
  // Success message if not in a worker
  if (process.env.NODE_ENV !== 'worker') {
    console.log(`Generated template: ${options.output}`);
  }
} catch (error: any) {
  console.error(`Error generating template: ${error.message}`);
  process.exit(1);
} 