import { SchemaNode } from '../../lib/schema-parser';
import { generateLayoutSpec } from '../../lib/layout-spec/layout-generator';
import { LayoutSpecification } from '../../lib/layout-spec/layout-types';

describe('Layout Specification Generator', () => {
  // Test basic generation from a schema
  it('should generate a basic layout spec from a schema', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        name: {
          id: 'root.name',
          type: 'string',
          title: 'Name'
        },
        age: {
          id: 'root.age',
          type: 'number',
          title: 'Age'
        }
      }
    };
    
    const layoutSpec = generateLayoutSpec(schema);
    
    // Check basic structure
    expect(layoutSpec).toHaveProperty('layout');
    expect(layoutSpec).toHaveProperty('order');
    
    // Check that properties are included
    expect(layoutSpec.order).toContain('name');
    expect(layoutSpec.order).toContain('age');
    expect(layoutSpec).toHaveProperty('name');
    expect(layoutSpec).toHaveProperty('age');
  });
  
  // Test using existing x-layout property
  it('should use existing x-layout property if available', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      'x-layout': 'grid',
      properties: {
        name: {
          id: 'root.name',
          type: 'string'
        }
      }
    };
    
    const layoutSpec = generateLayoutSpec(schema);
    expect(layoutSpec.layout).toBe('grid');
  });
  
  // Test nested objects
  it('should handle nested objects correctly', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        personal: {
          id: 'root.personal',
          type: 'object',
          properties: {
            firstName: {
              id: 'root.personal.firstName',
              type: 'string'
            },
            lastName: {
              id: 'root.personal.lastName',
              type: 'string'
            }
          }
        }
      }
    };
    
    const layoutSpec = generateLayoutSpec(schema);
    
    // Check that nested structure is preserved
    expect(layoutSpec).toHaveProperty('personal');
    expect(layoutSpec.personal).toHaveProperty('layout');
    expect(layoutSpec.personal).toHaveProperty('order');
    expect(layoutSpec.personal.order).toContain('firstName');
    expect(layoutSpec.personal.order).toContain('lastName');
  });
  
  // Test array handling
  it('should handle array types correctly', () => {
    const schema: SchemaNode = {
      id: 'root',
      type: 'object',
      properties: {
        items: {
          id: 'root.items',
          type: 'array',
          items: {
            id: 'root.items.item',
            type: 'object',
            properties: {
              name: {
                id: 'root.items[].name',
                type: 'string'
              }
            }
          }
        }
      }
    };
    
    const layoutSpec = generateLayoutSpec(schema);
    
    // Check array properties
    expect(layoutSpec.items).toBeDefined();
    expect(layoutSpec.items).toHaveProperty('itemLayout');
  });
  
  // Test layout heuristics
  it('should apply layout heuristics based on property count', () => {
    // Schema with many properties should get grid layout
    const largeSchema: SchemaNode = {
      id: 'large',
      type: 'object',
      properties: {
        prop1: { id: 'large.prop1', type: 'string' },
        prop2: { id: 'large.prop2', type: 'string' },
        prop3: { id: 'large.prop3', type: 'string' },
        prop4: { id: 'large.prop4', type: 'string' },
        prop5: { id: 'large.prop5', type: 'string' },
        prop6: { id: 'large.prop6', type: 'string' }
      }
    };
    
    // Schema with few properties should get vertical layout
    const smallSchema: SchemaNode = {
      id: 'small',
      type: 'object',
      properties: {
        prop1: { id: 'small.prop1', type: 'string' },
        prop2: { id: 'small.prop2', type: 'string' }
      }
    };
    
    const largeSpec = generateLayoutSpec(largeSchema);
    const smallSpec = generateLayoutSpec(smallSchema);
    
    expect(largeSpec.layout).toBe('grid');
    expect(smallSpec.layout).toBe('vertical');
  });
  
  // Test deeply nested objects
  it('should apply appropriate layouts for deeply nested objects', () => {
    const deepSchema: SchemaNode = {
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
                  properties: {
                    name: { id: 'root.level1.level2.level3.name', type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const layoutSpec = generateLayoutSpec(deepSchema);
    
    // At level 3+, we should have grid or vertical layout (not wizard/tabs)
    const level3Layout = layoutSpec.level1.level2.level3.layout;
    expect(['grid', 'vertical']).toContain(level3Layout);
  });
  
  // Test handling of JSON Schema conditional directives
  describe('Schema Conditional Directives', () => {
    it('should handle if/then/else conditional', () => {
      const schema: SchemaNode = {
        id: 'form',
        type: 'object',
        properties: {
          userType: { 
            id: 'form.userType', 
            type: 'string',
            enum: ['personal', 'business']
          }
        },
        conditionals: [
          {
            type: 'if',
            schema: {
              id: 'form.if',
              type: 'object',
              properties: {
                userType: { 
                  id: 'form.if.userType',
                  type: 'string', 
                  enum: ['business'] 
                }
              }
            }
          },
          {
            type: 'then',
            schema: {
              id: 'form.then',
              type: 'object',
              properties: {
                companyName: { 
                  id: 'form.then.companyName', 
                  type: 'string' 
                },
                taxId: { 
                  id: 'form.then.taxId', 
                  type: 'string' 
                }
              }
            }
          },
          {
            type: 'else',
            schema: {
              id: 'form.else',
              type: 'object',
              properties: {
                firstName: { 
                  id: 'form.else.firstName', 
                  type: 'string' 
                },
                lastName: { 
                  id: 'form.else.lastName', 
                  type: 'string' 
                }
              }
            }
          }
        ]
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      
      // Check that conditionals are included in the layout spec
      expect(layoutSpec.conditionals).toBeDefined();
      
      // A more comprehensive implementation would handle conditionals more explicitly
      // This is a basic test to ensure they're at least being included
    });
    
    it('should handle allOf conditional', () => {
      const schema: SchemaNode = {
        id: 'form',
        type: 'object',
        properties: {
          user: { id: 'form.user', type: 'object' }
        },
        conditionals: [
          {
            type: 'allOf',
            schema: [
              {
                id: 'form.allOf.0',
                type: 'object',
                properties: {
                  name: { id: 'form.allOf.0.name', type: 'string' }
                }
              },
              {
                id: 'form.allOf.1',
                type: 'object',
                properties: {
                  email: { id: 'form.allOf.1.email', type: 'string', format: 'email' }
                }
              }
            ]
          }
        ]
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      
      // Check that conditionals are included in the layout spec
      expect(layoutSpec.conditionals).toBeDefined();
    });
    
    it('should handle oneOf/anyOf conditionals', () => {
      const schema: SchemaNode = {
        id: 'form',
        type: 'object',
        properties: {
          contactMethod: { id: 'form.contactMethod', type: 'string' }
        },
        conditionals: [
          {
            type: 'oneOf',
            schema: [
              {
                id: 'form.oneOf.0',
                type: 'object',
                properties: {
                  email: { id: 'form.oneOf.0.email', type: 'string', format: 'email' }
                }
              },
              {
                id: 'form.oneOf.1',
                type: 'object',
                properties: {
                  phone: { id: 'form.oneOf.1.phone', type: 'string' }
                }
              }
            ]
          },
          {
            type: 'anyOf',
            schema: [
              {
                id: 'form.anyOf.0',
                type: 'object',
                properties: {
                  newsletter: { id: 'form.anyOf.0.newsletter', type: 'boolean' }
                }
              },
              {
                id: 'form.anyOf.1',
                type: 'object',
                properties: {
                  promotions: { id: 'form.anyOf.1.promotions', type: 'boolean' }
                }
              }
            ]
          }
        ]
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      
      // Check that conditionals are included in the layout spec
      expect(layoutSpec.conditionals).toBeDefined();
      
      // Verify that both oneOf and anyOf conditionals are handled
      if (Array.isArray(layoutSpec.conditionals)) {
        expect(layoutSpec.conditionals.length).toBe(2);
      }
    });
  });
  
  // Test all layout types
  describe('Layout Types', () => {
    it('should support tabs layout', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        'x-layout': 'tabs',
        properties: {
          personal: {
            id: 'root.personal',
            type: 'object',
            properties: {
              name: { id: 'root.personal.name', type: 'string' }
            }
          },
          contact: {
            id: 'root.contact',
            type: 'object',
            properties: {
              email: { id: 'root.contact.email', type: 'string' }
            }
          },
          preferences: {
            id: 'root.preferences',
            type: 'object',
            properties: {
              theme: { id: 'root.preferences.theme', type: 'string' }
            }
          }
        }
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      expect(layoutSpec.layout).toBe('tabs');
      expect(layoutSpec.order).toContain('personal');
      expect(layoutSpec.order).toContain('contact');
      expect(layoutSpec.order).toContain('preferences');
    });
    
    it('should support vtabs layout', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        'x-layout': 'vtabs',
        properties: {
          personal: {
            id: 'root.personal',
            type: 'object',
            properties: {
              name: { id: 'root.personal.name', type: 'string' }
            }
          },
          contact: {
            id: 'root.contact',
            type: 'object',
            properties: {
              email: { id: 'root.contact.email', type: 'string' }
            }
          }
        }
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      expect(layoutSpec.layout).toBe('vtabs');
    });
    
    it('should support wizard layout', () => {
      const schema: SchemaNode = {
        id: 'root',
        type: 'object',
        'x-layout': 'wizard',
        properties: {
          step1: {
            id: 'root.step1',
            type: 'object',
            properties: {
              name: { id: 'root.step1.name', type: 'string' }
            }
          },
          step2: {
            id: 'root.step2',
            type: 'object',
            properties: {
              email: { id: 'root.step2.email', type: 'string' }
            }
          },
          step3: {
            id: 'root.step3',
            type: 'object',
            properties: {
              confirm: { id: 'root.step3.confirm', type: 'boolean' }
            }
          }
        }
      };
      
      const layoutSpec = generateLayoutSpec(schema);
      expect(layoutSpec.layout).toBe('wizard');
      expect(layoutSpec.order?.length).toBe(3);
    });
    
    it('should include layout options for special layouts', () => {
      const tabsSchema: SchemaNode = {
        id: 'tabs',
        type: 'object',
        'x-layout': 'tabs',
        layoutOptions: {
          tabPosition: 'left'
        },
        properties: {
          tab1: { id: 'tabs.tab1', type: 'object' },
          tab2: { id: 'tabs.tab2', type: 'object' }
        }
      };
      
      const wizardSchema: SchemaNode = {
        id: 'wizard',
        type: 'object',
        'x-layout': 'wizard',
        layoutOptions: {
          showSteps: true,
          allowJump: false
        },
        properties: {
          step1: { id: 'wizard.step1', type: 'object' },
          step2: { id: 'wizard.step2', type: 'object' }
        }
      };
      
      const gridSchema: SchemaNode = {
        id: 'grid',
        type: 'object',
        'x-layout': 'grid',
        layoutOptions: {
          columns: 3,
          gap: '10px'
        },
        properties: {
          field1: { id: 'grid.field1', type: 'string' },
          field2: { id: 'grid.field2', type: 'string' },
          field3: { id: 'grid.field3', type: 'string' }
        }
      };
      
      const tabsSpec = generateLayoutSpec(tabsSchema);
      const wizardSpec = generateLayoutSpec(wizardSchema);
      const gridSpec = generateLayoutSpec(gridSchema);
      
      // Layout options should be preserved
      expect(tabsSpec.options).toBeDefined();
      expect(wizardSpec.options).toBeDefined();
      expect(gridSpec.options).toBeDefined();
      
      // Specific options should be preserved
      expect(tabsSpec.options?.tabPosition).toBe('left');
      expect(wizardSpec.options?.showSteps).toBe(true);
      expect(wizardSpec.options?.allowJump).toBe(false);
      expect(gridSpec.options?.columns).toBe(3);
      expect(gridSpec.options?.gap).toBe('10px');
    });
  });
}); 