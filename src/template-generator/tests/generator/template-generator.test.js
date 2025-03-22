/**
 * Jest tests for JSON Schema Form Template Generator
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { JSDOM } = require('jsdom');

// Constants - use project root-based paths
const PROJECT_ROOT = process.cwd();
const TEST_SCHEMAS_DIR = path.join(PROJECT_ROOT, 'tests/schemas');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'tests/generated');

// Create output directory if it doesn't exist
beforeAll(() => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(TEST_SCHEMAS_DIR)) {
    fs.mkdirSync(TEST_SCHEMAS_DIR, { recursive: true });
  }
  
  // If no schema files exist, copy our existing fixtures
  const schemaFiles = fs.readdirSync(TEST_SCHEMAS_DIR);
  if (schemaFiles.length === 0) {
    console.log('No schema files found. Copying test fixtures...');
    const fixtures = ['simple.json', 'conditional.json'];
    fixtures.forEach(fixture => {
      try {
        const source = path.join(PROJECT_ROOT, 'tests/schemas', fixture);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, path.join(TEST_SCHEMAS_DIR, fixture));
        }
      } catch (error) {
        console.warn(`Failed to copy fixture ${fixture}: ${error.message}`);
      }
    });
  }
});

/**
 * Validate the generated HTML for a schema
 */
function validateHtml(html, schemaName) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Test 1: Form element exists
  const formEl = document.querySelector('form');
  expect(formEl).not.toBeNull();
  
  // Test 2: Form has data-schema-id attribute
  expect(formEl.hasAttribute('data-schema-id') || formEl.hasAttribute('data-schema-form')).toBeTruthy();

  // Test 3: Input elements have proper attributes
  const inputs = document.querySelectorAll('input, select, textarea');
  expect(inputs.length).toBeGreaterThan(0);

  // Check that all inputs have name attributes
  const inputsWithoutName = Array.from(inputs).filter(input => !input.hasAttribute('name'));
  expect(inputsWithoutName.length).toBe(0);

  // Basic schema-specific tests
  if (schemaName === 'conditional.json') {
    // Test for conditional section
    const additionalInfo = document.getElementById('additionalInfoSection');
    if (additionalInfo) {
      expect(additionalInfo.style.display).toBe('none');
    }
  }
}

// Generate and test each schema
describe('Template Generator', () => {
  // Find all test schemas
  const schemaFiles = fs.readdirSync(TEST_SCHEMAS_DIR)
    .filter(file => file.endsWith('.json'));
  
  // Add a test for each schema file
  schemaFiles.forEach(schemaFile => {
    test(`Generates valid template for ${schemaFile}`, () => {
      const schemaPath = path.join(TEST_SCHEMAS_DIR, schemaFile);
      const outputPath = path.join(OUTPUT_DIR, schemaFile.replace('.json', '.html'));

      // Generate template using the CLI
      const command = `node bin/generate-template.js -s "${schemaPath}" -o "${outputPath}"`;
      
      // Measure generation time
      const startTime = process.hrtime();
      execSync(command, { stdio: 'pipe' });
      const endTime = process.hrtime(startTime);
      const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
      
      // Log generation time
      console.log(`Generated template for ${schemaFile} in ${executionTime}ms`);
      
      // Read the generated HTML
      const htmlContent = fs.readFileSync(outputPath, 'utf-8');
      
      // Validate the HTML
      validateHtml(htmlContent, schemaFile);
      
      // Extra verification - the file should exist and have content
      expect(fs.existsSync(outputPath)).toBeTruthy();
      expect(htmlContent.length).toBeGreaterThan(0);
    });
  });
  
  // Add performance test for complex schemas
  test('Handles complex schemas efficiently', () => {
    // If no complex schemas found, use the largest available schema
    let testSchema;
    if (schemaFiles.length > 0) {
      // Find the largest schema file
      const schemaStats = schemaFiles.map(file => ({
        file,
        size: fs.statSync(path.join(TEST_SCHEMAS_DIR, file)).size
      }));
      
      schemaStats.sort((a, b) => b.size - a.size);
      testSchema = schemaStats[0].file;
      
      console.log(`Using ${testSchema} (${schemaStats[0].size} bytes) for performance testing`);
    } else {
      console.log('No schemas available for performance testing, skipping test');
      return;
    }
    
    const schemaPath = path.join(TEST_SCHEMAS_DIR, testSchema);
    const outputPath = path.join(OUTPUT_DIR, testSchema.replace('.json', '-perf.html'));
    
    // Generate template and measure time
    const command = `node bin/generate-template.js -s "${schemaPath}" -o "${outputPath}"`;
    
    const startTime = process.hrtime();
    execSync(command, { stdio: 'pipe' });
    const endTime = process.hrtime(startTime);
    const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
    
    console.log(`Performance test: generated template in ${executionTime}ms`);
    
    // Verify generation was successful
    expect(fs.existsSync(outputPath)).toBeTruthy();
    
    // Performance assertion - template generation should be reasonably fast
    // This is just a basic threshold, adjust as needed
    expect(parseFloat(executionTime)).toBeLessThan(5000); // 5 seconds max
  });
}); 