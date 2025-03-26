import { SchemaNode } from '../../lib/schema-parser';
import { applyLayoutSpec } from '../../lib/layout-spec/layout-apply';
import { LayoutSpecification } from '../../lib/layout-spec/layout-types';
import { generateTemplateAsync } from '../../lib/generator';
import { expect, jest, describe, it } from '@jest/globals';

// Mock the template generation functions
jest.mock('../../lib/generator', () => ({
  generateTemplateAsync: jest.fn().mockResolvedValue('<div>mocked template</div>')
}));

describe('Layout Specification Application', () => {
  // Test applying layout spec to schema
  it('should apply layout specification to schema', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: { id: 'root.name', type: 'string' },
        age: { id: 'root.age', type: 'number' }
      }
    };
    
    const layoutSpec: LayoutSpecification = {
      layout: 'vertical',
      order: ['age', 'name'] // Reordering properties
    };
    
    const result = applyLayoutSpec(schema, layoutSpec);
    
    // Layout should be applied
    expect(result.layout).toBe('vertical');
    
    // Properties should be reordered based on spec
    const propertyNames = Object.keys(result.properties || {});
    expect(propertyNames[0]).toBe('age');
    expect(propertyNames[1]).toBe('name');
  });
  
  // Test applying nested layout specs
  it('should apply nested layout specifications', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        personal: {
          id: 'root.personal',
          type: 'object',
          properties: {
            firstName: { id: 'root.personal.firstName', type: 'string' },
            lastName: { id: 'root.personal.lastName', type: 'string' }
          }
        }
      }
    };
    
    const layoutSpec: LayoutSpecification = {
      layout: 'vertical',
      personal: {
        layout: 'grid',
        options: {
          columns: 2
        }
      }
    };
    
    const result = applyLayoutSpec(schema, layoutSpec);
    
    expect(result.layout).toBe('vertical');
    expect(result.properties?.personal.layout).toBe('grid');
    expect(result.properties?.personal.layoutOptions?.columns).toBe(2);
  });
  
  // Test applying layout options
  it('should apply layout options correctly', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {}
    };
    
    const layoutSpec: LayoutSpecification = {
      layout: 'tabs',
      options: {
        tabPosition: 'left',
        padding: '1rem'
      }
    };
    
    const result = applyLayoutSpec(schema, layoutSpec);
    
    expect(result.layout).toBe('tabs');
    expect(result.layoutOptions?.tabPosition).toBe('left');
    expect(result.layoutOptions?.padding).toBe('1rem');
  });
  
  // Test integration with template generator
  it('should generate template using layout specification', async () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: { id: 'root.name', type: 'string' }
      }
    };
    
    const layoutSpec: LayoutSpecification = {
      layout: 'grid',
      options: {
        columns: 3
      }
    };
    
    // First apply layout spec to schema
    const modifiedSchema = applyLayoutSpec(schema, layoutSpec);
    
    // Then generate template from modified schema
    await generateTemplateAsync(modifiedSchema);
    
    // Check if generateTemplateAsync was called with correctly modified schema
    expect(generateTemplateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        layout: 'grid',
        layoutOptions: expect.objectContaining({
          columns: 3
        })
      }),
      '/path/to/templates'
    );
  });
  
  // Test with partial layout spec
  it('should handle partial layout specifications', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: { id: 'root.name', type: 'string' },
        age: { id: 'root.age', type: 'number' }
      }
    };
    
    // Layout spec with only some properties configured
    const partialSpec: LayoutSpecification = {
      order: ['age', 'name'] // Reverse order, but no layout specified
    };
    
    const result = applyLayoutSpec(schema, partialSpec);
    
    // Should apply default layout
    expect(result.layout).toBe('vertical');
    
    // Should change the order of properties
    const propertyKeys = Object.keys(result.properties || {});
    expect(propertyKeys[0]).toBe('age');
    expect(propertyKeys[1]).toBe('name');
  });
  
  // Tests for layout constraint enforcement
  describe('Layout Constraints Enforcement', () => {
    // Test that apply rejects invalid layouts at level 3+
    it('should reject invalid layout at level 3+', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          level1: {
            id: 'root.level1',
            type: 'object',
            properties: {
              level2: {
                id: 'root.level1.level2',
                type: 'object',
                properties: {
                  level3: {
                    id: 'root.level1.level2.level3',
                    type: 'object',
                    properties: {}
                  }
                }
              }
            }
          }
        }
      };
      
      const invalidSpec: LayoutSpecification = {
        layout: 'vertical',
        level1: {
          layout: 'vertical',
          level2: {
            layout: 'vertical',
            level3: {
              layout: 'wizard' // Invalid at level 3+
            }
          }
        }
      };
      
      expect(() => applyLayoutSpec(schema, invalidSpec)).toThrow('Layout specification validation failed');
    });
    
    // Test that apply rejects wizard inside wizard
    it('should reject wizard inside wizard', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          step1: {
            id: 'root.step1',
            type: 'object',
            properties: {}
          }
        }
      };
      
      const invalidSpec: LayoutSpecification = {
        layout: 'wizard',
        step1: {
          layout: 'wizard' // Invalid: wizard inside wizard
        }
      };
      
      expect(() => applyLayoutSpec(schema, invalidSpec)).toThrow('Layout specification validation failed');
    });
    
    // Test that apply enforces vtabs inside tabs
    it('should reject tabs inside tabs', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          tab1: {
            id: 'root.tab1',
            type: 'object',
            properties: {}
          }
        }
      };
      
      const invalidSpec: LayoutSpecification = {
        layout: 'tabs',
        tab1: {
          layout: 'tabs' // Invalid: tabs inside tabs
        }
      };
      
      expect(() => applyLayoutSpec(schema, invalidSpec)).toThrow('Layout specification validation failed');
    });
    
    // Test that valid layout combinations work
    it('should allow valid layout combinations', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          tab1: {
            id: 'root.tab1',
            type: 'object',
            properties: {
              section: {
                id: 'root.tab1.section',
                type: 'object',
                properties: {
                  subsection: {
                    id: 'root.tab1.section.subsection',
                    type: 'object',
                    properties: {}
                  }
                }
              }
            }
          }
        }
      };
      
      const validSpec: LayoutSpecification = {
        layout: 'tabs',
        tab1: {
          layout: 'vtabs', // Valid: vtabs inside tabs
          section: {
            layout: 'vertical',
            subsection: {
              layout: 'grid' // Valid: grid at level 3+
            }
          }
        }
      };
      
      // Should not throw
      const result = applyLayoutSpec(schema, validSpec);
      
      // Verify layouts were applied correctly
      expect(result.layout).toBe('tabs');
      expect(result.properties?.tab1.layout).toBe('vtabs');
      expect(result.properties?.tab1.properties?.section.layout).toBe('vertical');
      expect(result.properties?.tab1.properties?.section.properties?.subsection.layout).toBe('grid');
    });
  });
}); 