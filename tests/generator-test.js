#!/usr/bin/env node

/**
 * Test script for JSON Schema Form Template Generator
 * 
 * This script tests the template generator by:
 * 1. Generating templates for all test schemas
 * 2. Validating the output HTML structure
 * 3. Measuring performance for complex schemas
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Constants
const TEST_SCHEMAS_DIR = path.join(__dirname, '../src/test-schemas');
const OUTPUT_DIR = path.join(__dirname, '../test-output');
const TEST_RESULTS = {
  total: 0,
  passed: 0,
  failed: 0,
  schemas: []
};

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Color output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test utility functions
function logHeader(message) {
  console.log('\n' + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.cyan + message + colors.reset);
  console.log(colors.cyan + '='.repeat(80) + colors.reset);
}

function logSuccess(message) {
  console.log(colors.green + '✓ ' + message + colors.reset);
}

function logError(message) {
  console.log(colors.red + '✗ ' + message + colors.reset);
}

function logInfo(message) {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

function validateHtml(html, schemaName) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const tests = [];

  // Test 1: Form element exists
  tests.push({
    name: 'Form element exists',
    result: !!document.querySelector('form'),
    details: 'A <form> element should be present in the generated template'
  });

  // Test 2: Form has data-schema-form attribute
  const formEl = document.querySelector('form');
  tests.push({
    name: 'Form has data-schema-form attribute',
    result: formEl && formEl.hasAttribute('data-schema-form'),
    details: 'The form should have a data-schema-form attribute for the runtime engine'
  });

  // Test 3: Input elements have proper attributes
  const inputs = document.querySelectorAll('input, select, textarea');
  let inputsWithName = 0;
  let inputsWithPath = 0;

  inputs.forEach(input => {
    if (input.hasAttribute('name')) inputsWithName++;
    if (input.hasAttribute('data-schema-path')) inputsWithPath++;
  });

  tests.push({
    name: 'Input elements have name attributes',
    result: inputs.length > 0 && inputsWithName === inputs.length,
    details: `${inputsWithName}/${inputs.length} inputs have name attributes`
  });

  tests.push({
    name: 'Input elements have data-schema-path attributes',
    result: inputs.length > 0 && inputsWithPath === inputs.length,
    details: `${inputsWithPath}/${inputs.length} inputs have data-schema-path attributes`
  });

  // Schema-specific tests
  if (schemaName === 'simple-material.json') {
    // Test for conditional section
    const additionalInfo = document.querySelector('[data-schema-path="additionalInfo"]');
    tests.push({
      name: 'Additional info section exists',
      result: !!additionalInfo,
      details: 'The additional info section should be present in the template'
    });
  }

  // Calculate test results
  const passed = tests.filter(t => t.result).length;
  const failed = tests.length - passed;

  return {
    name: schemaName,
    tests,
    passed,
    failed,
    testCount: tests.length
  };
}

// Main test function
async function runTests() {
  logHeader('JSON Schema Form Template Generator Tests');
  
  try {
    // Get all test schemas
    const schemaFiles = fs.readdirSync(TEST_SCHEMAS_DIR)
      .filter(file => file.endsWith('.json'));
    
    logInfo(`Found ${schemaFiles.length} test schemas`);
    
    // Test each schema
    for (const schemaFile of schemaFiles) {
      const schemaPath = path.join(TEST_SCHEMAS_DIR, schemaFile);
      const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));
      
      logInfo(`Testing template generation for ${schemaFile}...`);
      
      // Measure generation time
      const startTime = process.hrtime();
      
      try {
        // Generate template using the CLI
        const command = `node bin/generate-template.js -s "${schemaPath}" -o "${outputPath}"`;
        execSync(command, { stdio: 'pipe' });
        
        const endTime = process.hrtime(startTime);
        const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
        
        // Read the generated HTML
        const htmlContent = fs.readFileSync(outputPath, 'utf-8');
        
        // Validate the HTML
        const validationResult = validateHtml(htmlContent, schemaFile);
        TEST_RESULTS.total += validationResult.testCount;
        TEST_RESULTS.passed += validationResult.passed;
        TEST_RESULTS.failed += validationResult.failed;
        TEST_RESULTS.schemas.push({
          name: schemaFile,
          output: outputPath,
          executionTime,
          ...validationResult
        });
        
        // Log results
        if (validationResult.failed === 0) {
          logSuccess(`Generated template for ${schemaFile} (${executionTime}ms)`);
        } else {
          logError(`Generated template for ${schemaFile} but ${validationResult.failed} validation tests failed`);
        }
        
        // Output detailed test results
        validationResult.tests.forEach(test => {
          if (test.result) {
            console.log(`  ${colors.green}✓${colors.reset} ${test.name}`);
          } else {
            console.log(`  ${colors.red}✗${colors.reset} ${test.name}: ${test.details}`);
          }
        });
        
      } catch (error) {
        logError(`Failed to generate template for ${schemaFile}`);
        console.error(error.toString());
        TEST_RESULTS.failed++;
      }
    }
    
    // Print summary
    logHeader('Test Summary');
    console.log(`Total Tests: ${TEST_RESULTS.total}`);
    console.log(`Passed: ${colors.green}${TEST_RESULTS.passed}${colors.reset}`);
    console.log(`Failed: ${colors.red}${TEST_RESULTS.failed}${colors.reset}`);
    
    // Detailed schema summary
    TEST_RESULTS.schemas.forEach(schema => {
      console.log(`\n${schema.name}:`);
      console.log(`  Generation Time: ${schema.executionTime}ms`);
      console.log(`  Tests: ${schema.passed}/${schema.testCount} passed`);
    });
    
    // Exit with appropriate status code
    process.exit(TEST_RESULTS.failed > 0 ? 1 : 0);
    
  } catch (error) {
    logError('Test execution failed');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 