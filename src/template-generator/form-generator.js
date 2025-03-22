const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');
const ArrayTableRenderer = require('./runtime/array-table-renderer');

class FormGenerator {
    constructor() {
        // Load form templates
        this.template = fs.readFileSync(path.resolve(__dirname, 'templates/form.mustache'), 'utf8');
        this.fieldTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/field.mustache'), 'utf8');
        this.arrayItemTemplate = fs.readFileSync(path.resolve(__dirname, 'templates/array-item.mustache'), 'utf8');
        
        // Create renderers
        this.arrayTableRenderer = new ArrayTableRenderer();
    }
    
    /**
     * Process array property and render the appropriate UI
     */
    processArrayProperty(schema, propertyName, property, required) {
        const fieldId = this.getFieldId(propertyName);
        
        // Check if we should use table layout for this array
        // Support both layout.type === 'table' and layout.displayType === 'table'
        const layout = property.layout || {};
        if (layout.type === 'table' || layout.displayType === 'table') {
            // Use the table renderer
            const html = this.arrayTableRenderer.render(property, fieldId);
            return {
                id: fieldId,
                html: html,
                isRequired: required.includes(propertyName)
            };
        }
        
        // Standard array rendering (existing code)
        const itemSchema = property.items || {};
        const itemType = itemSchema.type || 'object';
        
        // ... rest of existing array processing code ...
    }
    
    generateForm(schema, options = {}) {
        // ... existing code ...
        
        // Process properties
        Object.keys(properties).forEach(propertyName => {
            const property = properties[propertyName];
            
            // Skip if property should be hidden
            if (property.ui && property.ui.hidden === true) {
                return;
            }
            
            switch (property.type) {
                // ... existing cases ...
                
                case 'array':
                    const arrayField = this.processArrayProperty(schema, propertyName, property, requiredProperties);
                    fields.push(arrayField);
                    break;
                
                // ... existing cases ...
            }
        });
        
        // ... rest of existing code ...
    }
    
    // ... existing code ...
}

module.exports = FormGenerator; 