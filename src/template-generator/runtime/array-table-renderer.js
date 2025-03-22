/**
 * Array Table Renderer
 * This module handles rendering array items in table form with column definitions
 */
const Mustache = require('mustache');
const fs = require('fs');
const path = require('path');

class ArrayTableRenderer {
  constructor() {
    // Load the table template
    const templatePath = path.resolve(__dirname, '../templates/array-table.mustache');
    this.template = fs.readFileSync(templatePath, 'utf8');
  }
  
  /**
   * Render an array table based on schema and column definitions
   * @param {Object} schema - The JSON schema for the array
   * @param {string} id - The array ID
   * @param {Object} options - Additional rendering options
   * @returns {string} The rendered HTML for the array table
   */
  render(schema, id, options = {}) {
    if (!schema || !id) {
      throw new Error('Schema and ID are required to render array table');
    }
    
    const layout = schema.layout || {};
    
    // Support both layout.type and layout.displayType
    if (layout.type !== 'table' && layout.displayType !== 'table') {
      return null;
    }
    
    // Prepare render data
    const renderData = {
      containerId: id,
      schemaId: options.schemaId || id,
      columns: this.prepareColumns(schema),
      columnCount: (layout.columns || []).length,
      itemLabel: layout.itemLabel || 'Item'
    };
    
    // Render the template
    return Mustache.render(this.template, renderData);
  }
  
  /**
   * Prepare column definitions for rendering
   * @param {Object} schema - The JSON schema
   * @returns {Array} Array of column definitions with additional properties for rendering
   */
  prepareColumns(schema) {
    const layout = schema.layout || {};
    const columns = layout.columns || [];
    const actions = layout.actions || [];
    
    // Add rendering flags to columns
    return columns.map(column => {
      const result = { ...column };
      
      // Check if this is the actions column
      if (column.field === 'actions') {
        result.isActionColumn = true;
        
        // Convert action names to flags for Mustache
        result.actions = actions.map(action => {
          return {
            name: action,
            isEdit: action === 'edit',
            isDelete: action === 'delete',
            isMoveUp: action === 'moveUp',
            isMoveDown: action === 'moveDown'
          };
        });
      } else {
        // For data columns, add type information
        result.isActionColumn = false;
        
        // Get property info for this field
        if (schema.items?.properties && column.field in schema.items.properties) {
          const property = schema.items.properties[column.field];
          
          // Set type flags
          result.isString = property.type === 'string';
          result.isNumber = property.type === 'number' || property.type === 'integer';
          result.isBoolean = property.type === 'boolean';
          result.isObject = property.type === 'object';
          result.isArray = property.type === 'array';
          
          // Special formats
          result.isEmail = property.format === 'email';
          result.isDate = property.format === 'date';
          
          // Enum handling
          if (property.enum) {
            result.isEnum = true;
            result.options = property.enum.map((value, index) => {
              const label = property.enumNames?.[index] || value;
              return { value, label };
            });
          }
        } else if (schema.items?.type === 'string' && column.field === 'value') {
          // Handle the case of a simple string array
          result.isString = true;
        }
      }
      
      return result;
    });
  }
  
  /**
   * Create view model for array table from data
   * @param {Object} schema - The JSON schema
   * @param {Array} data - The array data
   * @returns {Object} View model for the array table
   */
  createViewModel(schema, data) {
    if (!schema || !data) {
      return { rows: [] };
    }
    
    // Prepare basic structure
    const viewModel = {
      schema,
      rows: []
    };
    
    // Handle different data types based on schema
    if (schema.items?.type === 'object') {
      // Object array - map data to row model
      viewModel.rows = data.map(item => {
        return { data: item };
      });
    } else if (schema.items?.type === 'string') {
      // String array - create value objects
      viewModel.rows = data.map(item => {
        return { data: { value: item } };
      });
    }
    
    return viewModel;
  }
  
  /**
   * Parse form data from array table
   * @param {HTMLElement} table - The table element
   * @param {Object} schema - The array schema
   * @returns {Array} The parsed array data
   */
  parseFormData(table, schema) {
    if (!table || !schema) {
      return [];
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
      return [];
    }
    
    // Get all visible rows (not including the template)
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
      !row.classList.contains('array-row-template') && 
      !row.classList.contains('hidden')
    );
    
    // Extract data based on schema type
    if (schema.items?.type === 'object') {
      // Object array - collect data from cell inputs
      return rows.map(row => {
        const itemData = {};
        
        // Find all cells with data attributes
        const cells = row.querySelectorAll('td[data-field]');
        
        cells.forEach(cell => {
          const fieldName = cell.getAttribute('data-field');
          if (fieldName === 'actions') return; // Skip action column
          
          const input = cell.querySelector('input, select, textarea');
          
          if (input) {
            // Get property info for this field
            const property = schema.items.properties?.[fieldName];
            
            // Extract value based on input type and property type
            let value;
            if (input.type === 'checkbox') {
              value = input.checked;
            } else if (property?.type === 'number' || property?.type === 'integer') {
              value = input.value !== '' ? Number(input.value) : null;
            } else {
              value = input.value;
            }
            
            itemData[fieldName] = value;
          }
        });
        
        return itemData;
      });
    } else if (schema.items?.type === 'string') {
      // Simple string array
      return rows.map(row => {
        const cell = row.querySelector('td[data-field="value"]');
        const input = cell?.querySelector('input');
        return input?.value || '';
      });
    }
    
    return [];
  }
}

module.exports = ArrayTableRenderer; 