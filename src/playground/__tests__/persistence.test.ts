import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { LayoutConfig } from '../layoutSpecs';
import { loadLayoutsFromDisk, loadSchemasFromDisk, saveLayoutToDisk, saveSchemaToDisk, saveSchemaToMemory } from '../persistence';
import { parseSchema } from '../../template-generator/lib/schema-parser';

// Create test data directory paths
const TEST_ROOT = path.join(__dirname, '..', '..', '..', 'test-data');
const SCHEMA_DIR = path.join(TEST_ROOT, 'schemas');
const LAYOUT_DIR = path.join(TEST_ROOT, 'layouts');

// Mock the __dirname in the modules to point to our test directory
jest.mock('path', () => {
  const originalPath = jest.requireActual('path');
  return {
    ...originalPath,
    join: (...args: string[]) => {
      if (args[0] === __dirname && args[1] === 'data') {
        return SCHEMA_DIR;
      }
      if (args[0] === __dirname && args[1] === 'data' && args[2] === 'layouts') {
        return LAYOUT_DIR;
      }
      return originalPath.join(...args);
    }
  };
});

describe('Persistence Tests', () => {
  // Set up test data
  const testSchema = {
    id: 'test-schema',
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' }
    },
    required: ['name', 'email']
  };
  
  const testLayout: LayoutConfig = {
    id: 'mylayout-id',
    layout: 'vertical',
    order: ['name', 'email'],
    layoutOptions: {
      spacing: '10px',
      padding: '15px'
    }
  };
  
  // Setup and teardown
  beforeAll(async () => {
    // Create test directories if they don't exist
    await fs.mkdir(SCHEMA_DIR, { recursive: true });
    await fs.mkdir(LAYOUT_DIR, { recursive: true });
  });
  
  afterAll(async () => {
    // Clean up test files after all tests
    if (existsSync(SCHEMA_DIR)) {
      const files = await fs.readdir(SCHEMA_DIR);
      for (const file of files) {
        await fs.unlink(path.join(SCHEMA_DIR, file));
      }
    }
    
    if (existsSync(LAYOUT_DIR)) {
      const files = await fs.readdir(LAYOUT_DIR);
      for (const file of files) {
        await fs.unlink(path.join(LAYOUT_DIR, file));
      }
    }
    
    // Remove test directories
    if (existsSync(SCHEMA_DIR)) {
      await fs.rmdir(SCHEMA_DIR);
    }
    if (existsSync(LAYOUT_DIR)) {
      await fs.rmdir(LAYOUT_DIR);
    }
    if (existsSync(TEST_ROOT)) {
      await fs.rmdir(TEST_ROOT);
    }
  });
  
  // Test cases
  describe('Schema Persistence', () => {
    afterEach(async () => {
      // Clean up test schema files after each test
      try {
        await fs.unlink(path.join(SCHEMA_DIR, 'test-schema.json'));
      } catch (error) {
        // Ignore errors if file doesn't exist
      }
    });
    
    test('should save schema to disk', async () => {
      // Save schema to disk
      const result = await saveSchemaToDisk('test-schema', testSchema, SCHEMA_DIR);
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify file exists
      const filePath = path.join(SCHEMA_DIR, 'test-schema.json');
      const exists = existsSync(filePath);
      expect(exists).toBe(true);
      
      // Verify file contents
      const fileContent = await fs.readFile(filePath, 'utf8');
      const savedSchema = JSON.parse(fileContent);
      expect(savedSchema).toEqual(testSchema);
    });
    
    test('should load schemas from disk', async () => {
      // First save a schema
      await saveSchemaToDisk('test-schema', testSchema, SCHEMA_DIR); 
      
      // Load schemas from disk
      const loadedSchemas = await loadSchemasFromDisk(SCHEMA_DIR);
      
      // Verify at least one schema was loaded
      expect(loadedSchemas.length).toBeGreaterThanOrEqual(1);
      
    });
    
    // test('should not save schema without ID', async () => {
    //   const schema = {
    //     type: 'object',
    //     properties: {
    //       name: { type: 'string' }
    //     }
    //   };
      
    //   const parsed = parseSchema(JSON.stringify(schema)) as any;
    //   delete parsed.id;
      
    //   // Try to save schema without ID
    //   const result = await saveSchemaToDisk('invalid-schema', parsed, SCHEMA_DIR);
      
    //   // Verify it failed
    //   expect(result).toBe(false);
    // });
  });
  
  describe('Layout Persistence', () => {
    afterEach(async () => {
      // Clean up test layout files after each test
      try {
        await fs.unlink(path.join(LAYOUT_DIR, 'test-schema.json'));
      } catch (error) {
        // Ignore errors if file doesn't exist
      }
    });
    
    test('should save layout to disk', async () => {
      // Save layout to disk
      const result = await saveLayoutToDisk('test-schema-layout', testLayout, LAYOUT_DIR);
      
      // Verify result
      expect(result).toBe(true);
      
      // Verify file exists
      const filePath = path.join(LAYOUT_DIR, 'test-schema-layout.json');
      const exists = existsSync(filePath);
      expect(exists).toBe(true);
      
      // Verify file contents
      const fileContent = await fs.readFile(filePath, 'utf8');
      const savedLayout = JSON.parse(fileContent);
      expect(savedLayout).toEqual(testLayout);
    });
    
    test('should load layouts from disk', async () => {
      // First save a layout
      await saveLayoutToDisk('test-schema-layout2', testLayout, LAYOUT_DIR);
      
      // Load layouts from disk
      const loadedSchemas = await loadLayoutsFromDisk(LAYOUT_DIR);
      // Verify at least one layout was loaded
      expect(loadedSchemas.length).toBeGreaterThanOrEqual(1);
    });
    
  //   test('should not save layout without schema ID', async () => {
  //     // Try to save layout without schema ID
  //     const result = await saveLayoutToDisk('test-schema-layout3', testLayout, LAYOUT_DIR);
      
  //     // Verify it failed
  //     expect(result).toBe(false);
  //   });
  });
  
  describe('Integration Tests', () => {
    test('should save and load both schema and layout', async () => {
      // Save schema and layout
      await saveSchemaToDisk('test-schema', testSchema, SCHEMA_DIR);
      await saveLayoutToDisk('test-schema-layout', testLayout, LAYOUT_DIR);
      
      // Load from disk
      const loadedSchemas = await loadSchemasFromDisk(SCHEMA_DIR);
      const loadedLayouts = await loadLayoutsFromDisk(LAYOUT_DIR);
      
      // Verify both were loaded
      expect(loadedSchemas.length).toBeGreaterThanOrEqual(1);
      expect(loadedLayouts.length).toBeGreaterThanOrEqual(1);
    });
  });
}); 