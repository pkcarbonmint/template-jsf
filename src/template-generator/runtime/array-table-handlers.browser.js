/**
 * Array Table Handlers - Browser Version
 * Provides functionality for initializing and handling array table operations
 */
(function(window) {
  'use strict';
  
  /**
   * Initialize array table handlers for all tables in a container
   * @param {HTMLElement} container - The container element (form or other element)
   */
  function initArrayTables(container) {
    if (!container) return;
    
    // Find all array tables
    const arrayTables = container.querySelectorAll('.array-table');
    
    arrayTables.forEach(table => {
      setupArrayTable(table);
    });
  }
  
  /**
   * Set up event handlers for a single array table
   * @param {HTMLElement} table - The table element to set up
   */
  function setupArrayTable(table) {
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rowTemplate = table.querySelector('.array-row-template');
    const addButton = table.querySelector('.add-item');
    
    if (!tbody || !rowTemplate || !addButton) {
      console.warn('Array table is missing required elements', table);
      return;
    }
    
    // Setup add item button
    addButton.addEventListener('click', () => {
      addArrayRow(table);
    });
    
    // Add initial row if table is empty
    if (tbody.querySelectorAll('tr:not(.array-row-template)').length === 0) {
      addArrayRow(table);
    }
    
    // Setup event delegation for action buttons
    tbody.addEventListener('click', (event) => {
      const target = event.target;
      
      // Handle delete button
      if (target.classList.contains('action-delete') || target.closest('.action-delete')) {
        const row = target.closest('tr');
        if (row) {
          deleteArrayRow(table, row);
        }
      }
      
      // Handle move up button
      if (target.classList.contains('action-move-up') || target.closest('.action-move-up')) {
        const row = target.closest('tr');
        if (row) {
          moveRowUp(table, row);
        }
      }
      
      // Handle move down button
      if (target.classList.contains('action-move-down') || target.closest('.action-move-down')) {
        const row = target.closest('tr');
        if (row) {
          moveRowDown(table, row);
        }
      }
      
      // Handle edit button
      if (target.classList.contains('action-edit') || target.closest('.action-edit')) {
        const row = target.closest('tr');
        if (row) {
          editArrayRow(table, row);
        }
      }
    });
  }
  
  /**
   * Add a new row to an array table
   * @param {HTMLElement} table - The array table
   * @returns {HTMLElement} The newly added row
   */
  function addArrayRow(table) {
    const tbody = table.querySelector('tbody');
    const rowTemplate = table.querySelector('.array-row-template');
    
    if (!tbody || !rowTemplate) {
      console.warn('Cannot add array row, missing tbody or template');
      return null;
    }
    
    // Clone the template
    const newRow = rowTemplate.cloneNode(true);
    
    // Remove template class
    newRow.classList.remove('array-row-template');
    newRow.classList.remove('hidden');
    
    // Generate unique IDs for all fields in the new row
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uniqueId = `${timestamp}-${random}`;
    
    // Update all input IDs and names to be unique
    updateFieldIdentifiers(newRow, uniqueId);
    
    // Append the new row to the table body
    tbody.appendChild(newRow);
    
    // Trigger array change event
    triggerArrayChangeEvent(table);
    
    return newRow;
  }
  
  /**
   * Delete a row from an array table
   * @param {HTMLElement} table - The array table
   * @param {HTMLElement} row - The row to delete
   * @returns {boolean} Whether the row was deleted
   */
  function deleteArrayRow(table, row) {
    const tbody = table.querySelector('tbody');
    
    if (!tbody) {
      console.warn('Cannot delete array row, missing tbody');
      return false;
    }
    
    // Get all visible rows (not including the template)
    const visibleRows = Array.from(tbody.querySelectorAll('tr')).filter(r => 
      !r.classList.contains('array-row-template') && 
      !r.classList.contains('hidden')
    );
    
    // Only remove if there's more than one row 
    // (we always keep at least one row in the array)
    if (visibleRows.length > 1) {
      row.remove();
      triggerArrayChangeEvent(table);
      return true;
    } else {
      console.info('Cannot remove the last array row');
      return false;
    }
  }
  
  /**
   * Move a row up in the array table
   * @param {HTMLElement} table - The array table
   * @param {HTMLElement} row - The row to move up
   * @returns {boolean} Whether the row was moved
   */
  function moveRowUp(table, row) {
    const prevRow = row.previousElementSibling;
    
    // Make sure it's not the first row or the template
    if (prevRow && !prevRow.classList.contains('array-row-template')) {
      row.parentNode.insertBefore(row, prevRow);
      triggerArrayChangeEvent(table);
      return true;
    }
    
    return false;
  }
  
  /**
   * Move a row down in the array table
   * @param {HTMLElement} table - The array table
   * @param {HTMLElement} row - The row to move down
   * @returns {boolean} Whether the row was moved
   */
  function moveRowDown(table, row) {
    const nextRow = row.nextElementSibling;
    
    // Make sure there is a next row
    if (nextRow) {
      row.parentNode.insertBefore(nextRow, row);
      triggerArrayChangeEvent(table);
      return true;
    }
    
    return false;
  }
  
  /**
   * Toggle edit mode for a row
   * @param {HTMLElement} table - The array table
   * @param {HTMLElement} row - The row to edit
   * @returns {boolean} Whether edit mode was toggled
   */
  function editArrayRow(table, row) {
    // Toggle the editing class
    row.classList.toggle('editing');
    
    // Emit edit event
    const event = new CustomEvent('array:edit', {
      bubbles: true,
      cancelable: true,
      detail: {
        arrayId: table.id,
        row: row
      }
    });
    
    row.dispatchEvent(event);
    
    return true;
  }
  
  /**
   * Update field identifiers in a row to make them unique
   * @param {HTMLElement} element - The element containing fields to update
   * @param {string} uniqueId - The unique ID to append to field identifiers
   */
  function updateFieldIdentifiers(element, uniqueId) {
    // Update input elements
    const inputs = element.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const originalId = input.id;
      const originalName = input.getAttribute('name');
      const schemaId = input.getAttribute('data-schema-id');
      
      if (originalId) {
        const newId = `${originalId}_${uniqueId}`;
        input.id = newId;
        
        // Update associated labels
        const labels = element.querySelectorAll(`label[for="${originalId}"]`);
        labels.forEach(label => {
          label.setAttribute('for', newId);
        });
      }
      
      if (originalName) {
        input.setAttribute('name', `${originalName}_${uniqueId}`);
      }
      
      if (schemaId) {
        input.setAttribute('data-schema-id', `${schemaId}_${uniqueId}`);
      }
    });
  }
  
  /**
   * Trigger a change event for the array table
   * @param {HTMLElement} table - The array table
   */
  function triggerArrayChangeEvent(table) {
    // Create a custom event
    const event = new CustomEvent('array:change', {
      bubbles: true,
      cancelable: true,
      detail: {
        arrayId: table.id,
        table: table
      }
    });
    
    table.dispatchEvent(event);
  }
  
  /**
   * Get data from an array table
   * @param {HTMLElement} table - The array table
   * @param {Object} schema - The array schema
   * @returns {Array} The parsed data
   */
  function getArrayTableData(table, schema) {
    if (!table || !schema) {
      return [];
    }
    
    // Fallback implementation
    const tbody = table.querySelector('tbody');
    
    if (!tbody) {
      return [];
    }
    
    // Get all visible rows (not including the template)
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
      !row.classList.contains('array-row-template') && 
      !row.classList.contains('hidden')
    );
    
    // Extract data from each row
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
  
  /**
   * Set array table data
   * @param {HTMLElement} table - The array table
   * @param {Object} schema - The array schema
   * @param {Array} data - The data to set
   */
  function setArrayTableData(table, schema, data) {
    if (!table || !schema || !data || !Array.isArray(data)) {
      return;
    }
    
    const tbody = table.querySelector('tbody');
    const rowTemplate = table.querySelector('.array-row-template');
    
    if (!tbody || !rowTemplate) {
      return;
    }
    
    // Remove existing rows (except template)
    Array.from(tbody.querySelectorAll('tr:not(.array-row-template)')).forEach(row => {
      row.remove();
    });
    
    // Add a row for each data item
    data.forEach(item => {
      const newRow = addArrayRow(table);
      
      if (!newRow) return;
      
      // Populate row with data
      if (typeof item === 'object') {
        // Object array
        Object.entries(item).forEach(([key, value]) => {
          const cell = newRow.querySelector(`td[data-field="${key}"]`);
          if (!cell) return;
          
          const input = cell.querySelector('input, select, textarea');
          if (!input) return;
          
          if (input.type === 'checkbox') {
            input.checked = Boolean(value);
          } else {
            input.value = value !== null && value !== undefined ? value : '';
          }
        });
      } else {
        // Simple array
        const valueCell = newRow.querySelector('td[data-field="value"]');
        if (valueCell) {
          const input = valueCell.querySelector('input');
          if (input) {
            input.value = item;
          }
        }
      }
    });
  }
  
  // Export the array table handlers to the global window object
  window.ArrayTableHandlers = {
    initArrayTables,
    setupArrayTable,
    addArrayRow,
    deleteArrayRow,
    moveRowUp,
    moveRowDown,
    editArrayRow,
    getArrayTableData,
    setArrayTableData
  };
  
})(window); 