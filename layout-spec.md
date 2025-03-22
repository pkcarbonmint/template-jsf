# Layout Specification Format

I want to add a new feature where a tool walks the schema tree and generates a layout specification file. The idea is that we start with an auto-generated layout specification, followed by human edits and then use the file to guide template generation process.

## Development guidance:

- First we come up with a specification file format 
- TDD approach to development, so generate tests first and then make them pass.

## Layout Specification Format

The layout specification uses a JSON structure inspired by React JSON Schema Form (RJSF), with the "ui:" prefix removed for simplicity. This format controls how the form is rendered and laid out, separate from the data schema itself.

### Key Features

1. **Root Configuration**:
   - `layout`: The layout type for the root element
   - `order`: Controls the order of child properties
   - `description`: Optional description of the layout

2. **Per-Property Configuration**:
   - Each property can have its own layout settings
   - Nesting follows the schema structure

3. **Layout Types**:
   - `"layout": "vertical"` - Default vertical stacking
   - `"layout": "grid"` - Grid layout with columns
   - `"layout": "tabs"` - Tabbed interface
   - `"layout": "vtabs"` - Vertical tabs
   - `"layout": "wizard"` - Multi-step wizard

4. **Layout Options**:
   - `"options": { ... }` - Layout-specific configuration
   - For grid: columns, gap
   - For tabs: tabPosition
   - Common: padding, margin, etc.

5. **Property Ordering**:
   - `"order": ["prop1", "prop2", ...]` - Explicit order for child properties
   - Properties not listed will appear after those specified

6. **Responsive Layouts**:
   - `"responsive": { ... }` - Breakpoint-specific overrides
   - Can target specific nodes and change their layout properties

7. **Styling Hooks**:
   - `"classNames": "..."` - CSS classes to apply

### Example Layout Specification

```json
{
  "order": ["personalInfo", "contactDetails", "preferences"],
  "layout": "vertical",
  "description": "Main form layout",
  
  "personalInfo": {
    "layout": "grid",
    "options": {
      "columns": 2,
      "gap": "1rem"
    },
    "order": ["firstName", "lastName", "dateOfBirth"],
    "classNames": "primary-section",
    
    "firstName": {
      "autofocus": true,
      "placeholder": "Enter your first name"
    }
  },
  
  "contactDetails": {
    "layout": "vertical",
    "options": {
      "padding": "1rem"
    },
    "order": ["email", "phone", "address"],
    
    "address": {
      "layout": "grid",
      "options": {
        "columns": 2
      }
    }
  },
  
  "preferences": {
    "layout": "tabs",
    "options": {
      "tabPosition": "left"
    },
    "order": ["theme", "notifications", "privacy"]
  },
  
  "responsive": {
    "small": {
      "personalInfo": {
        "layout": "vertical"
      },
      "preferences": {
        "layout": "vtabs"
      }
    }
  }
}
```

### TypeScript Interface

```typescript
/**
 * Layout specification for form templates
 */
interface LayoutSpecification {
  /** Layout type for the current node */
  layout?: LayoutType;
  
  /** Ordering of child properties */
  order?: string[];
  
  /** Optional description */
  description?: string;
  
  /** CSS classes to apply to the element */
  classNames?: string;
  
  /** Layout-specific configuration options */
  options?: LayoutOptions;
  
  /** Responsive layout overrides */
  responsive?: {
    [breakpoint: string]: LayoutSpecification;
  };
  
  /** Child property configurations - matches schema properties */
  [propertyName: string]: LayoutSpecification | any;
}

/** Supported layout types */
type LayoutType = 'vertical' | 'grid' | 'tabs' | 'vtabs' | 'wizard';

/** Layout options interface */
interface LayoutOptions {
  /** Number of columns for grid layout */
  columns?: number;
  
  /** Spacing between grid items */
  gap?: string;
  
  /** Position for tabs: top, left, right, bottom */
  tabPosition?: 'top' | 'left' | 'right' | 'bottom';
  
  /** Padding around elements */
  padding?: string;
  
  /** Show steps for wizard layout */
  showSteps?: boolean;
  
  /** Allow jumping between wizard steps */
  allowJump?: boolean;
  
  /** Additional custom options */
  [key: string]: any;
}
```

## Implementation Approach

To implement the layout specification feature, we will follow these steps:

1. **Layout Specification Generator**:
   - Create a tool to walk the schema tree
   - Apply the same heuristics used in `assignLayoutStrategy`
   - Generate an initial layout specification file

2. **Layout Specification Parser**:
   - Develop a parser to read the layout specification
   - Validate the specification against the schema

3. **Template Generator Integration**:
   - Modify the template generator to use the layout specification
   - Apply layout settings from the spec instead of calling `assignLayoutStrategy`

4. **Test Suite**:
   - Write comprehensive tests for generation, parsing, and application
   - Include tests for responsive behavior and custom options

### Development Steps (TDD Approach)

1. **Define Types and Interfaces**:
   - Create TypeScript interfaces for the specification format
   - Ensure type safety throughout the implementation

2. **Write Generator Tests**:
   ```typescript
   describe('Layout Specification Generator', () => {
     it('should generate a basic layout spec from a schema', () => {
       const schema = { /* sample schema */ };
       const layoutSpec = generateLayoutSpec(schema);
       expect(layoutSpec).toHaveProperty('layout');
     });
     
     it('should use existing x-layout property if available', () => {
       const schema = { 
         type: 'object',
         'x-layout': 'grid',
         properties: {} 
       };
       const layoutSpec = generateLayoutSpec(schema);
       expect(layoutSpec.layout).toBe('grid');
     });
   });
   ```

3. **Write Parser Tests**:
   ```typescript
   describe('Layout Specification Parser', () => {
     it('should parse a valid layout specification', () => {
       const layoutSpec = { /* sample layout spec */ };
       const result = parseLayoutSpec(layoutSpec);
       expect(result).toBeDefined();
     });
     
     it('should validate layout specification against schema', () => {
       const schema = { /* sample schema */ };
       const layoutSpec = { /* invalid layout spec */ };
       expect(() => validateLayoutSpec(layoutSpec, schema)).toThrow();
     });
   });
   ```

4. **Write Application Tests**:
   ```typescript
   describe('Template Generator with Layout Spec', () => {
     it('should generate a template using layout spec', async () => {
       const schema = { /* sample schema */ };
       const layoutSpec = { /* sample layout spec */ };
       const html = await generateTemplateWithLayoutSpec(schema, layoutSpec, templatesDir);
       expect(html).toContain('<div');
     });
     
     it('should override default layout with layout spec settings', async () => {
       const schema = { 
         type: 'object',
         properties: {
           test: { type: 'string' }
         }
       };
       const layoutSpec = { 
         layout: "grid",
         options: { columns: 3 }
       };
       const html = await generateTemplateWithLayoutSpec(schema, layoutSpec, templatesDir);
       expect(html).toContain('grid');
       expect(html).toContain('columns: 3');
     });
   });
   ```

5. **Implement the Generator**:
   - Create a function to walk the schema tree
   - Apply layout heuristics
   - Generate the layout specification

6. **Implement the Parser and Validator**:
   - Create functions to parse and validate the specification
   - Ensure it works with the schema structure

7. **Integrate with Template Generator**:
   - Modify the template generator to use the layout specification
   - Apply layout settings during template generation
