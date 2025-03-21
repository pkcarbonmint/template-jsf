# JSON Schema Form (JSF)

A powerful library for generating dynamic HTML forms from JSON Schema definitions. The library provides template generation and runtime form handling, including validation, conditional display, and data binding.

## Why

JSON Schema provides a powerful way to describe and validate data structures, but implementing user-friendly forms that respect these schemas often requires complex, framework-specific solutions. This project aims to solve several common challenges:

1. **Separation of structure and presentation** - By decoupling the schema (data structure) from the template (presentation), we enable developers to create custom UIs while maintaining data integrity.

2. **Framework agnosticism** - Most existing JSON Schema form libraries are tightly coupled to specific frameworks (React, Vue, Angular). This lightweight approach works with vanilla JavaScript and minimal dependencies.

3. **Conditional visibility and validation** - JSON Schema's conditional features (if/then/else, allOf, anyOf) are powerful but difficult to implement in form UIs. This component handles complex conditional logic automatically.

4. **Developer flexibility** - Unlike rigid form generators, this approach allows developers to fully customize the form's appearance while the runtime handles the data binding and conditional logic.

5. **Performance** - By using a minimal set of dependencies and focusing on lightweight implementation, this component avoids the bloat common in larger form libraries.

## Development Workflow

This project provides a streamlined workflow for developing JSON Schema-based forms:

1. **Schema Definition**: Start by creating your JSON Schema in the `src/test-schemas` directory. The schema defines your data structure, validation rules, and conditional logic.

2. **Template Generation**: Use the template generator tool to create an initial HTML template from your schema:
   ```bash
   pnpm generate-template -s src/test-schemas/your-schema.json -o test-output/your-schema.html
   ```

3. **Template Customization**: Modify the generated HTML template to match your design requirements. The template uses data attributes like `data-schema-path` to connect HTML elements to schema properties.

4. **Runtime Testing**: Use the runtime demo to test your form's behavior:
   ```bash
   pnpm serve
   ```
   Then visit `http://localhost:4173/runtime-demo.html` and select your schema.

5. **Visibility Reporting**: During development, you can use the visibility report to understand which fields are visible and why:
   ```javascript
   const visibilityReport = formInstance.getFieldVisibilityReport();
   console.log(visibilityReport);
   ```

6. **Testing Changes**: Run tests to verify your form works correctly:
   ```bash
   pnpm test:runtime
   ```
   The tests verify form initialization, data binding, conditional logic, and submission.

7. **Integration**: Once your form is working as expected, integrate it into your application using the runtime library:
   ```javascript
   import { createSchemaForm } from './dist/runtime.es.js';
   const form = createSchemaForm('#container', {
     schema: yourSchema,
     onSubmit: (data) => handleSubmit(data)
   });
   ```

## Features

- Generate HTML forms directly from JSON Schema
- Support for common input types (text, number, select, checkbox, etc.)
- Nested objects and arrays
- Conditional display based on field values
- Form validation based on JSON Schema rules
- Custom templates and styling
- Minification option for compact output

## Conditional Validation Features

The library supports the following JSON Schema conditional validation keywords:

### if/then/else

Control form validation rules conditionally:

```json
{
  "if": {
    "properties": {
      "age": { "minimum": 18 }
    }
  },
  "then": {
    "required": ["agreeToTerms"]
  },
  "else": {
    "properties": {
      "_submitDisabled": { "const": true }
    }
  }
}
```

### allOf

Combine multiple schema conditions:

```json
"allOf": [
  {
    "if": {
      "properties": {
        "accountType": { "const": "business" }
      }
    },
    "then": {
      "required": ["businessSection"]
    }
  }
]
```

### anyOf

Validate against any of the given schemas:

```json
"anyOf": [
  {
    "properties": {
      "accountType": { "const": "business" },
      "businessSection": {
        "required": ["companyName", "taxId"]
      }
    }
  },
  {
    "properties": {
      "accountType": { "const": "personal" }
    }
  }
]
```

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/json-schema-form.git
cd json-schema-form

# Install dependencies
npm install
# or
pnpm install
```

## Usage

### Generating Templates

Generate HTML templates from JSON Schema:

```bash
# Generate a single template
pnpm generate-template -s src/schemas/myschema.json -o output/myform.html

# Generate all templates
pnpm generate

# Generate minified templates
pnpm generate:minify
```

### Using in a Web Page

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="/dist/runtime.es.js"></script>
</head>
<body>
  <div id="form-container"></div>
  
  <script type="module">
    import { createSchemaForm } from '/dist/runtime.es.js';
    
    // Initialize form
    const form = createSchemaForm('#form-container', {
      schemaUrl: '/schemas/myschema.json',
      onChange: (data) => console.log('Form data changed:', data),
      onSubmit: (data) => console.log('Form submitted:', data)
    });
  </script>
</body>
</html>
```

## Demos

The repository includes several demo pages to showcase the features:

- **Runtime Demo**: See how forms behave in real-time - `/runtime-demo.html`
- **Conditional Logic Demo**: Test conditional validation features - `/conditional-demo.html`
- **Template Playground**: Experiment with template generation - `/template-playground.html`

## Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
pnpm test:runtime         # Compact mode - shows only failures and summary
pnpm test:runtime:verbose # Verbose mode - shows all test results
pnpm test:runtime:vv      # Very verbose mode - shows all details including stack traces

# Generate templates
pnpm generate
```

## Testing

The test suite includes comprehensive tests for both the template generator and runtime engine.

### Runtime Tests

Runtime tests validate the form behavior including:
- Form initialization
- Data binding and events
- Conditional display
- Form submission
- Nested data structures
- Conditional validation (if/then/else, allOf, anyOf)

Test output can be controlled with the following options:
- **Compact mode** (default): Only shows failures and a summary of results
- **Verbose mode**: Shows all test results including passing tests
- **Very verbose mode**: Shows detailed debug information including stack traces

```bash
# Run tests in different verbosity modes
pnpm test:runtime         # Compact mode
pnpm test:runtime:verbose # Verbose mode 
pnpm test:runtime:vv      # Very verbose mode

# You can also use command line arguments with any test command
pnpm test:runtime -- --verbose
pnpm test:runtime -- --very-verbose
```
 