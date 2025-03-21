#!/usr/bin/env node

/**
 * Test runner for JSON Schema Form components
 * 
 * This script runs both the generator and runtime tests
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(colors.cyan + '=' + '='.repeat(78) + '=' + colors.reset);
console.log(colors.cyan + '=                      JSON Schema Form Test Runner                       =' + colors.reset);
console.log(colors.cyan + '=' + '='.repeat(78) + '=' + colors.reset);

// Install test dependencies if needed
try {
  console.log('\n' + colors.blue + 'Installing test dependencies...' + colors.reset);
  execSync('pnpm add --save-dev jsdom', { stdio: 'inherit' });
} catch (error) {
  console.error(colors.red + 'Failed to install test dependencies' + colors.reset);
  process.exit(1);
}

// Run tests
let generatorTestsPassed = false;
let runtimeTestsPassed = false;

// Run generator tests
console.log('\n' + colors.cyan + 'Running Template Generator Tests...' + colors.reset);
try {
  execSync('node ' + path.join(__dirname, 'generator-test.js'), { stdio: 'inherit' });
  generatorTestsPassed = true;
  console.log(colors.green + 'Template Generator Tests: PASSED' + colors.reset);
} catch (error) {
  console.error(colors.red + 'Template Generator Tests: FAILED' + colors.reset);
}

// Run runtime tests
console.log('\n' + colors.cyan + 'Running Runtime Engine Tests...' + colors.reset);
try {
  execSync('node ' + path.join(__dirname, 'runtime-test.js'), { stdio: 'inherit' });
  runtimeTestsPassed = true;
  console.log(colors.green + 'Runtime Engine Tests: PASSED' + colors.reset);
} catch (error) {
  console.error(colors.red + 'Runtime Engine Tests: FAILED' + colors.reset);
}

// Print summary
console.log('\n' + colors.cyan + '=' + '='.repeat(78) + '=' + colors.reset);
console.log(colors.cyan + '=                            Test Summary                                =' + colors.reset);
console.log(colors.cyan + '=' + '='.repeat(78) + '=' + colors.reset);

console.log('\nTemplate Generator: ' + (generatorTestsPassed ? colors.green + 'PASSED' : colors.red + 'FAILED') + colors.reset);
console.log('Runtime Engine: ' + (runtimeTestsPassed ? colors.green + 'PASSED' : colors.red + 'FAILED') + colors.reset);

// Exit with appropriate code
process.exit(generatorTestsPassed && runtimeTestsPassed ? 0 : 1); 