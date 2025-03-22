import { SchemaNode } from '../../lib/schema-parser';
import { parseLayoutSpec, validateLayoutSpec } from '../../lib/layout-spec/layout-parser';
import { LayoutSpecification } from '../../lib/layout-spec/layout-types';

describe('Layout Specification Parser', () => {
  // Test parsing a valid layout specification
  it('should parse a valid layout specification', () => {
    const layoutSpec: LayoutSpecification = {
      layout: 'vertical',
      order: ['personal', 'address'],
      personal: {
        layout: 'grid',
        options: {
          columns: 2
        }
      }
    };
    
    const result = parseLayoutSpec(layoutSpec);
    expect(result).toBeDefined();
    expect(result.layout).toBe('vertical');
    expect(result.personal.layout).toBe('grid');
    expect(result.personal.options.columns).toBe(2);
  });
  
  // Test validation against schema
  it('should validate layout specification against schema', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        personal: {
          id: 'root.personal',
          type: 'object',
          properties: {
            firstName: { id: 'root.personal.firstName', type: 'string' }
          }
        }
      }
    };
    
    // Valid layout spec (matches schema)
    const validSpec: LayoutSpecification = {
      layout: 'vertical',
      personal: {
        layout: 'grid',
        firstName: {
          classNames: 'highlight'
        }
      }
    };
    
    // Invalid layout spec (references non-existent property)
    const invalidSpec: LayoutSpecification = {
      layout: 'vertical',
      personal: {
        layout: 'grid',
        nonExistentField: {
          layout: 'vertical'
        }
      }
    };
    
    // Should not throw for valid spec
    expect(() => validateLayoutSpec(validSpec, schema)).not.toThrow();
    
    // Should throw for invalid spec with invalid layout type
    const invalidLayoutSpec: LayoutSpecification = {
      layout: 'invalid-layout-type' as any
    };
    expect(() => validateLayoutSpec(invalidLayoutSpec, schema)).toThrow();
  });
  
  // Test validation of layout types
  it('should validate layout types', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: { id: 'root.name', type: 'string' }
      }
    };
    
    // Valid layout type
    const validSpec: LayoutSpecification = {
      layout: 'grid'
    };
    
    // Invalid layout type
    const invalidSpec: LayoutSpecification = {
      layout: 'invalid-layout-type' as any
    };
    
    expect(() => validateLayoutSpec(validSpec, schema)).not.toThrow();
    expect(() => validateLayoutSpec(invalidSpec, schema)).toThrow();
  });
  
  // Test options validation
  it('should validate layout options', () => {
    const spec: LayoutSpecification = {
      layout: 'tabs',
      options: {
        tabPosition: 'invalid' as any
      },
      order: ['name']
    };
    
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: { id: 'root.name', type: 'string' }
      }
    };
    
    expect(() => validateLayoutSpec(spec, schema)).toThrow('Invalid tab position');
  });
  
  // Test responsive layout parsing
  it('should parse responsive layout configurations', () => {
    const spec: LayoutSpecification = {
      layout: 'vertical',
      responsive: {
        'desktop': {
          layout: 'grid',
          options: {
            columns: 2
          }
        },
        'mobile': {
          layout: 'vertical'
        }
      }
    };
    
    const parsed = parseLayoutSpec(spec);
    expect(parsed.responsive).toBeDefined();
    expect(parsed.responsive!.desktop.layout).toBe('grid');
    expect(parsed.responsive!.mobile.layout).toBe('vertical');
  });
  
  // Tests for layout constraints
  describe('Layout Constraints', () => {
    // Test for Level 3+ constraints
    it('should reject layouts other than grid or vertical at level 3+', () => {
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
      
      const spec: LayoutSpecification = {
        layout: 'vertical',
        level1: {
          layout: 'vertical',
          level2: {
            layout: 'vertical',
            level3: {
              layout: 'tabs' // This should be rejected
            }
          }
        }
      };
      
      expect(() => validateLayoutSpec(spec, schema)).toThrow('Only \'grid\' or \'vertical\' layouts are allowed at level 3+');
    });
    
    // Test for no wizard inside wizard
    it('should reject wizard inside wizard', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          level1: {
            id: 'root.level1',
            type: 'object',
            properties: {}
          }
        }
      };
      
      const spec: LayoutSpecification = {
        layout: 'wizard',
        level1: {
          layout: 'wizard' // This should be rejected
        }
      };
      
      expect(() => validateLayoutSpec(spec, schema)).toThrow('Wizard layout cannot be nested inside another wizard layout');
    });
    
    // Test for tabs inside tabs
    it('should reject tabs inside tabs', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          level1: {
            id: 'root.level1',
            type: 'object',
            properties: {}
          }
        }
      };
      
      const spec: LayoutSpecification = {
        layout: 'tabs',
        level1: {
          layout: 'tabs' // This should be rejected
        }
      };
      
      expect(() => validateLayoutSpec(spec, schema)).toThrow('Horizontal tabs cannot be nested inside tabs');
    });
    
    // Test for vtabs inside vtabs
    it('should reject vtabs inside vtabs', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        properties: {
          level1: {
            id: 'root.level1',
            type: 'object',
            properties: {}
          }
        }
      };
      
      const spec: LayoutSpecification = {
        layout: 'vtabs',
        level1: {
          layout: 'vtabs' // This should be rejected
        }
      };
      
      expect(() => validateLayoutSpec(spec, schema)).toThrow('Vertical tabs cannot be nested inside vertical tabs');
    });
    
    // Test for correct nesting
    it('should allow valid layout combinations', () => {
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
      
      const validSpec: LayoutSpecification = {
        layout: 'tabs',
        level1: {
          layout: 'vtabs',
          level2: {
            layout: 'vertical',
            level3: {
              layout: 'grid'
            }
          }
        }
      };
      
      // This should not throw any errors
      expect(() => validateLayoutSpec(validSpec, schema)).not.toThrow();
    });
  });
}); 