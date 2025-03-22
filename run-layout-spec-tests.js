const { execSync } = require('child_process');

console.log('Running layout-spec tests...');

try {
  // Run the tests for the layout-spec module specifically
  execSync('jest src/template-generator/tests/layout-spec --config jest.config.js', { 
    stdio: 'inherit' 
  });
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Test execution failed');
  process.exit(1);
} 