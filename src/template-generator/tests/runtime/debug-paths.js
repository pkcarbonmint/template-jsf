const path = require('path');
const fs = require('fs');

// Define paths
const TEST_DIR = path.resolve(__dirname);
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
const SCHEMAS_DIR = path.resolve(PROJECT_ROOT, 'tests/schemas');
const GENERATED_DIR = path.resolve(PROJECT_ROOT, 'tests/generated');

// Log paths
console.log('Test directory:', TEST_DIR);
console.log('Project root:', PROJECT_ROOT);
console.log('Schemas directory:', SCHEMAS_DIR);
console.log('Generated templates directory:', GENERATED_DIR);

// Check if directories exist
console.log('\nChecking if directories exist:');
console.log('Schemas directory exists:', fs.existsSync(SCHEMAS_DIR));
console.log('Generated directory exists:', fs.existsSync(GENERATED_DIR));

// List schema files if directory exists
if (fs.existsSync(SCHEMAS_DIR)) {
  console.log('\nSchema files:');
  const schemaFiles = fs.readdirSync(SCHEMAS_DIR);
  schemaFiles.forEach(file => {
    console.log(' -', file);
  });
} else {
  console.log('\nSchemas directory does not exist. Creating it...');
  try {
    fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
    console.log('Schemas directory created successfully.');
  } catch (error) {
    console.error('Failed to create schemas directory:', error.message);
  }
}

// List generated template files if directory exists
if (fs.existsSync(GENERATED_DIR)) {
  console.log('\nGenerated template files:');
  const templateFiles = fs.readdirSync(GENERATED_DIR);
  templateFiles.forEach(file => {
    console.log(' -', file);
  });
} else {
  console.log('\nGenerated templates directory does not exist. Creating it...');
  try {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
    console.log('Generated templates directory created successfully.');
  } catch (error) {
    console.error('Failed to create generated templates directory:', error.message);
  }
}

// Attempt to access specific files
console.log('\nAttempting to access specific files:');
const simpleSchemaPath = path.join(SCHEMAS_DIR, 'simple.json');
const conditionalSchemaPath = path.join(SCHEMAS_DIR, 'conditional.json');
const simpleTemplatePath = path.join(GENERATED_DIR, 'simple.html');
const conditionalTemplatePath = path.join(GENERATED_DIR, 'conditional.html');

console.log('simple.json exists:', fs.existsSync(simpleSchemaPath));
console.log('conditional.json exists:', fs.existsSync(conditionalSchemaPath));
console.log('simple.html exists:', fs.existsSync(simpleTemplatePath));
console.log('conditional.html exists:', fs.existsSync(conditionalTemplatePath)); 