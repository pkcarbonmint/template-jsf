#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { program } from 'commander';
import Mustache from 'mustache';
import { pipe } from 'fp-ts/function';
import { generateTemplate } from './lib/generator';
import { parseSchema } from './lib/schema-parser';

// Process command line arguments
// Remove "--" from the arguments if present
const args = process.argv.filter(arg => arg !== '--');

// Setup command line interface
program
  .name('schema-template-generator')
  .description('Generate HTML templates from JSON Schema')
  .version('1.0.0')
  .requiredOption('-s, --schema <path>', 'Path to JSON schema file')
  .option('-o, --output <path>', 'Output path for the generated HTML template', './output.html')
  .option('-t, --templates <path>', 'Path to custom Mustache templates directory', path.join(__dirname, 'templates'))
  .parse(args);

const options = program.opts();

// Add Mustache helpers
(Mustache as any).helpers = {
  equals: function(a: any, b: any) {
    return a === b;
  }
};

async function main() {
  try {
    // Check if templates directory exists
    if (!fs.existsSync(options.templates)) {
      console.error(`Templates directory not found: ${options.templates}`);
      process.exit(1);
    }

    // Read schema file
    const schemaContent = fs.readFileSync(options.schema, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Parse schema into intermediate representation
    const parsedSchema = parseSchema(schema);
    
    // Generate template from parsed schema
    const htmlTemplate = generateTemplate(parsedSchema, options.templates);
    
    // Create directory for output file if it doesn't exist
    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write output
    fs.writeFileSync(options.output, htmlTemplate, 'utf-8');
    
    console.log(`Template successfully generated at ${options.output}`);
  } catch (error) {
    console.error('Error generating template:', error);
    process.exit(1);
  }
}

main(); 