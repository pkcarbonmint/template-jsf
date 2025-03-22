#!/usr/bin/env node

/**
 * Jest Test Runner Script for Template Generator
 * 
 * This script provides a convenient way to run Jest tests for the template generator.
 * It can run specific test suites or all tests.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const JEST_CONFIG = path.resolve(__dirname, '../../../jest.config.js');
const TEST_DIRS = {
  generator: path.resolve(__dirname, 'generator'),
  runtime: path.resolve(__dirname, 'runtime'),
  layoutSpec: path.resolve(__dirname, 'layout-spec')
};

// Command line arguments
const args = process.argv.slice(2);
const watch = args.includes('--watch') || args.includes('-w');
const coverage = args.includes('--coverage') || args.includes('-c');
const verbose = args.includes('--verbose') || args.includes('-v');

// Determine which tests to run
let testsToRun = [];

if (args.includes('--all')) {
  // Run all tests
  testsToRun = Object.values(TEST_DIRS);
} else {
  // Check for specific test types
  if (args.includes('generator')) {
    testsToRun.push(TEST_DIRS.generator);
  }
  
  if (args.includes('runtime')) {
    testsToRun.push(TEST_DIRS.runtime);
  }
  
  if (args.includes('layout')) {
    testsToRun.push(TEST_DIRS.layoutSpec);
  }
  
  // Default to all tests if none specified
  if (testsToRun.length === 0) {
    testsToRun = Object.values(TEST_DIRS);
  }
}

// Build Jest command
let command = `npx jest --config ${JEST_CONFIG}`;

// Add test paths
command += ` ${testsToRun.join(' ')}`;

// Add options
if (watch) {
  command += ' --watch';
}

if (coverage) {
  command += ' --coverage';
}

if (verbose) {
  command += ' --verbose';
}

// Print info
console.log(`Running Jest tests with command: ${command}`);

try {
  // Execute Jest
  execSync(command, { stdio: 'inherit' });
  console.log('\nTests completed successfully.');
} catch (error) {
  console.error('\nTests failed:', error.message);
  process.exit(1);
} 