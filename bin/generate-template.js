#!/usr/bin/env node

/**
 * CLI wrapper for the template generator
 */

const path = require('path');
const { execSync } = require('child_process');

// Forward to the TypeScript implementation
execSync(`ts-node ${path.join(__dirname, '../src/template-generator/index.ts')} ${process.argv.slice(2).join(' ')}`, {
  stdio: 'inherit'
}); 