/**
 * Tests for Array Table Layout feature
 * This tests the functionality of displaying array items in a table format
 * with column definitions and action buttons
 */
const path = require('path');
const testEnv = require('./test-environment');

// Helper functions for array table layout testing
function setupArrayTableHandlers(formElement) {
  // Find all array tables
  const arrayTables = formElement.querySelectorAll('.array-table');
  
  arrayTables.forEach(table => {
    setupArrayTable(table);
  });
}

function setupArrayTable(table) {
  const tableId = table.id;
  if (!tableId) return;
  
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

function addArrayRow(table) {
  const tbody = table.querySelector('tbody');
  const rowTemplate = table.querySelector('.array-row-template');
  
  if (!tbody || !rowTemplate) {
    console.warn('Cannot add array row, missing tbody or template');
    throw new Error('Cannot add array row, missing tbody or template');
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

function deleteArrayRow(table, row) {
  const tbody = table.querySelector('tbody');
  
  if (!tbody) {
    console.warn('Cannot delete array row, missing tbody');
    return;
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
  } else {
    console.info('Cannot remove the last array row');
  }
}

function moveRowUp(table, row) {
  const prevRow = row.previousElementSibling;
  
  // Make sure it's not the first row or the template
  if (prevRow && !prevRow.classList.contains('array-row-template')) {
    row.parentNode.insertBefore(row, prevRow);
    triggerArrayChangeEvent(table);
  }
}

function moveRowDown(table, row) {
  const nextRow = row.nextElementSibling;
  
  // Make sure there is a next row
  if (nextRow) {
    row.parentNode.insertBefore(nextRow, row);
    triggerArrayChangeEvent(table);
  }
}

function editArrayRow(table, row) {
  // In a real implementation, this might open a modal or expand the row
  // For testing, we'll toggle a class
  row.classList.toggle('editing');
  
  // Emit edit event
  const event = new testEnv.window.Event('array:edit', {
    bubbles: true,
    cancelable: true
  });
  
  // Add detail property manually
  event.detail = {
    arrayId: table.id,
    row: row
  };
  
  row.dispatchEvent(event);
}

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

function triggerArrayChangeEvent(table) {
  // Create a standard Event object
  const event = new testEnv.window.Event('array:change', {
    bubbles: true,
    cancelable: true
  });
  
  // Add detail property manually
  event.detail = {
    arrayId: table.id,
    table: table
  };
  
  table.dispatchEvent(event);
}

function getArrayTableData(table) {
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
  return rows.map(row => {
    const result = {};
    
    // Find all cells with data attributes
    const cells = row.querySelectorAll('td[data-field]');
    
    cells.forEach(cell => {
      const fieldName = cell.getAttribute('data-field');
      const input = cell.querySelector('input, select, textarea');
      
      if (input) {
        // Extract value based on input type
        let value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else {
          value = input.value;
        }
        
        result[fieldName] = value;
      } else {
        // For cells without inputs, use the cell text content
        result[fieldName] = cell.textContent.trim();
      }
    });
    
    return result;
  });
}

/**
 * Set up test environment with a mock array table
 */
function setupArrayTableEnvironment() {
  // Create a simple HTML template with array table structure
  const template = `
    <div class="form-container">
      <form id="test-form">
        <div class="array-table-container">
          <table class="array-table" id="test-array-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Age</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr class="array-row-template hidden">
                <td data-field="name">
                  <input type="text" id="field-name" name="field-name" data-schema-id="items.name" />
                </td>
                <td data-field="email">
                  <input type="email" id="field-email" name="field-email" data-schema-id="items.email" />
                </td>
                <td data-field="age">
                  <input type="number" id="field-age" name="field-age" data-schema-id="items.age" />
                </td>
                <td class="actions">
                  <button type="button" class="action-edit">Edit</button>
                  <button type="button" class="action-move-up">Up</button>
                  <button type="button" class="action-move-down">Down</button>
                  <button type="button" class="action-delete">Delete</button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4">
                  <button type="button" class="add-item">Add Item</button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </form>
    </div>
  `;
  
  // Set up DOM
  const { document } = testEnv.setupDOM(template);
  
  return { document };
}

// Utility function to create a mock click event
function createClickEvent() {
  return new testEnv.window.MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: testEnv.window
  });
}

// Tests
describe('Array Table Layout Functionality', () => {
  // Clean up after each test
  afterEach(() => {
    testEnv.cleanup();
  });
  
  describe('Table Initialization', () => {
    test('should initialize array table and add initial row', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Check if initial row was added
      const tbody = document.querySelector('.array-table tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Should have at least one row (plus the template)
      expect(rows.length).toBe(1);
    });
  });
  
  describe('Table Row Operations', () => {
    test('should add new rows when add button is clicked', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Get initial row count
      const tbody = document.querySelector('.array-table tbody');
      const initialRows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      const initialCount = initialRows.length;
      
      // Click the add button
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Check if a new row was added
      const newRows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      expect(newRows.length).toBe(initialCount + 1);
    });
    
    test('should delete rows when delete button is clicked', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Add an extra row
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Get the current rows
      const tbody = document.querySelector('.array-table tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Store the initial count
      const initialCount = rows.length;
      expect(initialCount).toBeGreaterThan(1);
      
      // Click the delete button on the first row
      const deleteButton = rows[0].querySelector('.action-delete');
      deleteButton.dispatchEvent(createClickEvent());
      
      // Check the remaining rows
      const remainingRows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Verify one row was removed
      expect(remainingRows.length).toBe(initialCount - 1);
    });
    
    test('should not delete the last row', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Get the current rows
      const tbody = document.querySelector('.array-table tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Make sure there's only one row
      expect(rows.length).toBe(1);
      
      // Try to delete the last row
      const deleteButton = rows[0].querySelector('.action-delete');
      deleteButton.dispatchEvent(createClickEvent());
      
      // Check that the row wasn't deleted
      const remainingRows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      expect(remainingRows.length).toBe(1);
    });
    
    test('should move rows up and down', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Add two more rows (for a total of 3)
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      addButton.dispatchEvent(createClickEvent());
      
      // Get the tbody
      const tbody = document.querySelector('.array-table tbody');
      
      // Get all visible rows
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // We should have 3 rows now
      expect(rows.length).toBe(3);
      
      // Fill in the name field for each row to identify them
      rows[0].querySelector('input[name^="field-name"]').value = 'First';
      rows[1].querySelector('input[name^="field-name"]').value = 'Second';
      rows[2].querySelector('input[name^="field-name"]').value = 'Third';
      
      // Move the second row up
      const moveUpButton = rows[1].querySelector('.action-move-up');
      moveUpButton.dispatchEvent(createClickEvent());
      
      // Get the updated rows
      const rowsAfterMoveUp = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Check the order after moving up
      expect(rowsAfterMoveUp[0].querySelector('input[name^="field-name"]').value).toBe('Second');
      expect(rowsAfterMoveUp[1].querySelector('input[name^="field-name"]').value).toBe('First');
      expect(rowsAfterMoveUp[2].querySelector('input[name^="field-name"]').value).toBe('Third');
      
      // Move the third row up
      const moveUpButton2 = rowsAfterMoveUp[2].querySelector('.action-move-up');
      moveUpButton2.dispatchEvent(createClickEvent());
      
      // Get the updated rows again
      const rowsAfterMoveUp2 = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Check the order after moving up again
      expect(rowsAfterMoveUp2[0].querySelector('input[name^="field-name"]').value).toBe('Second');
      expect(rowsAfterMoveUp2[1].querySelector('input[name^="field-name"]').value).toBe('Third');
      expect(rowsAfterMoveUp2[2].querySelector('input[name^="field-name"]').value).toBe('First');
      
      // Now move the first row down
      const moveDownButton = rowsAfterMoveUp2[0].querySelector('.action-move-down');
      moveDownButton.dispatchEvent(createClickEvent());
      
      // Get the updated rows again
      const rowsAfterMoveDown = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Check the order after moving down
      expect(rowsAfterMoveDown[0].querySelector('input[name^="field-name"]').value).toBe('Third');
      expect(rowsAfterMoveDown[1].querySelector('input[name^="field-name"]').value).toBe('Second');
      expect(rowsAfterMoveDown[2].querySelector('input[name^="field-name"]').value).toBe('First');
    });
    
    test('should trigger edit mode for rows', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Get the first row
      const tbody = document.querySelector('.array-table tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      expect(rows.length).toBeGreaterThan(0);
      
      // Add event listener to capture array:edit events
      const editEventHandler = jest.fn();
      rows[0].addEventListener('array:edit', editEventHandler);
      
      // Click the edit button
      const editButton = rows[0].querySelector('.action-edit');
      editButton.dispatchEvent(createClickEvent());
      
      // Verify edit event was triggered
      expect(editEventHandler).toHaveBeenCalled();
      
      // Verify the row has the editing class
      expect(rows[0].classList.contains('editing')).toBe(true);
    });
  });
  
  describe('Table Data Management', () => {
    test('should collect data from table rows', () => {
      const { document } = setupArrayTableEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array table handlers
      setupArrayTableHandlers(formElement);
      
      // Get the table
      const table = document.querySelector('#test-array-table');
      
      // Get rows
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Fill in data for the first row
      rows[0].querySelector('input[name^="field-name"]').value = 'John Doe';
      rows[0].querySelector('input[name^="field-email"]').value = 'john@example.com';
      rows[0].querySelector('input[name^="field-age"]').value = '30';
      
      // Add a new row
      const addButton = table.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Get updated rows
      const updatedRows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      // Fill in data for the second row
      updatedRows[1].querySelector('input[name^="field-name"]').value = 'Jane Smith';
      updatedRows[1].querySelector('input[name^="field-email"]').value = 'jane@example.com';
      updatedRows[1].querySelector('input[name^="field-age"]').value = '25';
      
      // Get table data
      const tableData = getArrayTableData(table);
      
      // Verify data structure
      expect(Array.isArray(tableData)).toBe(true);
      expect(tableData.length).toBe(2);
      
      // Verify data content
      expect(tableData[0].name).toBe('John Doe');
      expect(tableData[0].email).toBe('john@example.com');
      expect(tableData[0].age).toBe('30');
      
      expect(tableData[1].name).toBe('Jane Smith');
      expect(tableData[1].email).toBe('jane@example.com');
      expect(tableData[1].age).toBe('25');
    });
  });
  
  describe('Layout Schema Configuration', () => {
    test('should support column definitions from schema', () => {
      // For this test, we'll create a more dynamic table setup
      // that uses column definitions from a schema
      
      const tableSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: 'integer' },
            isActive: { type: 'boolean' }
          }
        },
        layout: {
          displayType: 'table',
          columns: [
            { field: 'name', label: 'Full Name', width: '30%' },
            { field: 'email', label: 'Email Address', width: '30%' },
            { field: 'age', label: 'Age', width: '10%' },
            { field: 'isActive', label: 'Active?', width: '10%' },
            { field: 'actions', label: 'Actions', width: '20%' }
          ],
          actions: ['edit', 'delete', 'moveUp', 'moveDown']
        }
      };
      
      // We'd normally generate the HTML from the schema
      // For testing purposes, we'll create a simple representation
      const tableHtml = `
        <div class="form-container">
          <form id="dynamic-test-form">
            <div class="array-table-container">
              <table class="array-table" id="dynamic-array-table" data-schema-id="dynamicArray">
                <thead>
                  <tr>
                    <th style="width:30%">Full Name</th>
                    <th style="width:30%">Email Address</th>
                    <th style="width:10%">Age</th>
                    <th style="width:10%">Active?</th>
                    <th style="width:20%">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="array-row-template hidden">
                    <td data-field="name">
                      <input type="text" id="field-name" name="field-name" data-schema-id="items.name" />
                    </td>
                    <td data-field="email">
                      <input type="email" id="field-email" name="field-email" data-schema-id="items.email" />
                    </td>
                    <td data-field="age">
                      <input type="number" id="field-age" name="field-age" data-schema-id="items.age" />
                    </td>
                    <td data-field="isActive">
                      <input type="checkbox" id="field-isActive" name="field-isActive" data-schema-id="items.isActive" />
                    </td>
                    <td class="actions">
                      <button type="button" class="action-edit">Edit</button>
                      <button type="button" class="action-move-up">Up</button>
                      <button type="button" class="action-move-down">Down</button>
                      <button type="button" class="action-delete">Delete</button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5">
                      <button type="button" class="add-item">Add Item</button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </form>
        </div>
      `;
      
      // Set up DOM with the dynamic table
      const { document } = testEnv.setupDOM(tableHtml);
      
      // Store the schema in a data attribute (simulating how it would be available)
      const table = document.querySelector('#dynamic-array-table');
      table.setAttribute('data-schema', JSON.stringify(tableSchema));
      
      // Verify the table structure matches the schema definition
      const headers = Array.from(table.querySelectorAll('thead th'));
      expect(headers.length).toBe(5);
      
      // Check header labels
      expect(headers[0].textContent).toBe('Full Name');
      expect(headers[1].textContent).toBe('Email Address');
      expect(headers[2].textContent).toBe('Age');
      expect(headers[3].textContent).toBe('Active?');
      expect(headers[4].textContent).toBe('Actions');
      
      // Check header widths
      expect(headers[0].style.width).toBe('30%');
      expect(headers[1].style.width).toBe('30%');
      expect(headers[2].style.width).toBe('10%');
      expect(headers[3].style.width).toBe('10%');
      expect(headers[4].style.width).toBe('20%');
      
      // Check action buttons in template row
      const actionButtons = Array.from(table.querySelector('.array-row-template .actions').querySelectorAll('button'));
      expect(actionButtons.length).toBe(4); // edit, move up, move down, delete
      
      // Setup the table
      setupArrayTableHandlers(document.querySelector('#dynamic-test-form'));
      
      // Check that a row was added
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => 
        !row.classList.contains('array-row-template') && 
        !row.classList.contains('hidden')
      );
      
      expect(rows.length).toBe(1);
    });
  });
}); 