#!/usr/bin/env ts-node

import * as fs from 'fs/promises';
import * as path from 'path';
import { Command } from 'commander';
import { parseSchema } from './lib/schema-parser';
import { generateTemplateAsync } from './lib/generator';

// Configure command line options
const program = new Command();
program
  .requiredOption('-s, --schema <path>', 'Path to the JSON schema file')
  .requiredOption('-o, --output <path>', 'Path to the output HTML file')
  .option('-t, --templates <path>', 'Path to the Mustache templates directory', path.join(__dirname, 'templates'))
  .parse(process.argv);

const options = program.opts();

async function main() {
  // Validate inputs
  try {
    await fs.access(options.schema);
  } catch (error) {
    console.error(`Error: Schema file not found: ${options.schema}`);
    process.exit(1);
  }

  try {
    await fs.access(options.templates);
  } catch (error) {
    console.error(`Error: Templates directory not found: ${options.templates}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  const outputDir = path.dirname(options.output);
  try {
    await fs.access(outputDir);
  } catch (error) {
    await fs.mkdir(outputDir, { recursive: true });
  }

  try {
    // Read the schema file
    const schemaContent = await fs.readFile(options.schema, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Parse the schema
    const parsedSchema = parseSchema(schema);
    
    // Generate the template using async version
    const html = await generateTemplateAsync(parsedSchema);
    
    // Write the output file
    await fs.writeFile(options.output, html, 'utf-8');
    
    // Success message if not in a worker
    if (process.env.NODE_ENV !== 'worker') {
      console.log(`Generated template: ${options.output}`);
    }
  } catch (error: any) {
    console.error(`Error generating template: ${error.message}`);
    process.exit(1);
  }
}

// Run the CLI
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
}); 