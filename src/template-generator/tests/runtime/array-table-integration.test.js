/**
 * Integration test for array table functionality within the form generation system
 */
const fs = require('fs');
const path = require('path');
const ArrayTableRenderer = require('../../runtime/array-table-renderer');
const testEnv = require('./test-environment');

describe('Array Table Integration', () => {
  let renderer;
  
  // Load test schema
  const schemaPath = path.resolve(__dirname, '../schemas/array-table-schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  
  beforeEach(() => {
    renderer = new ArrayTableRenderer();
    
    // Mock the file system reading for the template
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath.includes('array-table.mustache')) {
        // Load the actual template content
        const templatePath = path.resolve(__dirname, '../../templates/array-table.mustache');
        try {
          return fs.readFileSync.requireActual(templatePath, 'utf8');
        } catch (error) {
          // Fallback to a simplified template if the actual one can't be loaded
          return `
            <div class="array-table-container" id="{{containerId}}-container">
              <table class="array-table" id="{{containerId}}" data-schema-id="{{schemaId}}">
                <thead>
                  <tr>
                    {{#columns}}
                    <th style="width:{{width}}">{{label}}</th>
                    {{/columns}}
                  </tr>
                </thead>
                <tbody>
                  <tr class="array-row-template hidden">
                    {{#columns}}
                    {{#isActionColumn}}
                    <td class="actions">
                      {{#actions}}
                      {{#isEdit}}<button type="button" class="action-edit">Edit</button>{{/isEdit}}
                      {{#isDelete}}<button type="button" class="action-delete">Delete</button>{{/isDelete}}
                      {{#isMoveUp}}<button type="button" class="action-move-up">Up</button>{{/isMoveUp}}
                      {{#isMoveDown}}<button type="button" class="action-move-down">Down</button>{{/isMoveDown}}
                      {{/actions}}
                    </td>
                    {{/isActionColumn}}
                    {{^isActionColumn}}
                    <td data-field="{{field}}">
                      {{#isBoolean}}<input type="checkbox" id="field-{{field}}" name="field-{{field}}" data-schema-id="items.{{field}}" />{{/isBoolean}}
                      {{#isNumber}}<input type="number" id="field-{{field}}" name="field-{{field}}" data-schema-id="items.{{field}}" />{{/isNumber}}
                      {{#isString}}<input type="text" id="field-{{field}}" name="field-{{field}}" data-schema-id="items.{{field}}" />{{/isString}}
                    </td>
                    {{/isActionColumn}}
                    {{/columns}}
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="{{columnCount}}">
                      <button type="button" class="add-item">Add {{itemLabel}}</button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          `;
        }
      }
      return '';
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    testEnv.cleanup();
  });
  
  /**
   * Helper function to set up a complete form with array table
   * and attach event handlers
   */
  function setupCompleteForm(schema, initialData = []) {
    const contactsSchema = schema.properties.contacts;
    const html = renderer.render(contactsSchema, 'contacts-table');
    
    // Set up DOM with rendered table
    const { document } = testEnv.setupDOM(`
      <div id="form-container">
        <form id="test-form">
          <h2>Contact List</h2>
          ${html}
          <div class="form-actions">
            <button type="submit">Submit</button>
          </div>
        </form>
      </div>
    `);
    
    // Collect key elements
    const form = document.getElementById('test-form');
    const table = document.getElementById('contacts-table');
    
    // Initialize the table with handlers
    setupArrayTable(table);
    
    // Set initial data if provided
    if (initialData && initialData.length > 0) {
      populateTableWithData(table, contactsSchema, initialData);
    }
    
    return { document, form, table };
  }
  
  /**
   * Set up array table handlers
   */
  function setupArrayTable(table) {
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    const rowTemplate = table.querySelector('.array-row-template');
    const addButton = table.querySelector('.add-item');
    
    if (!tbody || !rowTemplate || !addButton) {
      throw new Error('Array table is missing required elements');
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
      throw new Error('Cannot delete array row, missing tbody');
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
  
  function editArrayRow(table, row) {
    // Toggle the editing class
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
    
    return true;
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
  
  function populateTableWithData(table, schema, data) {
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
      
      // Populate row with data
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
    });
  }
  
  function getTableData(table, schema) {
    return renderer.parseFormData(table, schema);
  }
  
  // Integration Tests
  test('should render and handle a complete contact form with array table', () => {
    const contactsSchema = schema.properties.contacts;
    const initialData = [
      { name: 'John Doe', email: 'john@example.com', age: 35 },
      { name: 'Jane Smith', email: 'jane@example.com', age: 28 }
    ];
    
    const { document, form, table } = setupCompleteForm(schema, initialData);
    
    // Check that the table rendered
    expect(table).toBeTruthy();
    
    // Check that rows were created for the initial data
    const rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    expect(rows.length).toBe(2);
    
    // Verify data in the first row
    const firstRow = rows[0];
    expect(firstRow.querySelector('td[data-field="name"] input').value).toBe('John Doe');
    expect(firstRow.querySelector('td[data-field="email"] input').value).toBe('john@example.com');
    expect(firstRow.querySelector('td[data-field="age"] input').value).toBe('35');
    
    // Test adding a new row
    const addButton = table.querySelector('.add-item');
    addButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Check that a new row was added
    const updatedRows = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    expect(updatedRows.length).toBe(3);
    
    // Fill in data for the new row
    const newRow = updatedRows[2];
    newRow.querySelector('td[data-field="name"] input').value = 'Alice Johnson';
    newRow.querySelector('td[data-field="email"] input').value = 'alice@example.com';
    newRow.querySelector('td[data-field="age"] input').value = '42';
    
    // Get the data from the table
    const tableData = getTableData(table, contactsSchema);
    
    // Verify the table data
    expect(tableData.length).toBe(3);
    expect(tableData[0].name).toBe('John Doe');
    expect(tableData[1].name).toBe('Jane Smith');
    expect(tableData[2].name).toBe('Alice Johnson');
    expect(tableData[2].email).toBe('alice@example.com');
    expect(tableData[2].age).toBe(42); // Should be converted to number
  });
  
  test('should handle row operations - delete, move up, move down', () => {
    const initialData = [
      { name: 'First Row', email: 'first@example.com' },
      { name: 'Second Row', email: 'second@example.com' },
      { name: 'Third Row', email: 'third@example.com' }
    ];
    
    const { document, form, table } = setupCompleteForm(schema, initialData);
    
    // Get rows
    const rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    expect(rows.length).toBe(3);
    
    // Test move up - move second row up
    const moveUpButton = rows[1].querySelector('.action-move-up');
    moveUpButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Get updated rows
    const rowsAfterMoveUp = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    
    // Check row order
    expect(rowsAfterMoveUp[0].querySelector('td[data-field="name"] input').value).toBe('Second Row');
    expect(rowsAfterMoveUp[1].querySelector('td[data-field="name"] input').value).toBe('First Row');
    
    // Test move down - move first row (which is now Second Row) down
    const moveDownButton = rowsAfterMoveUp[0].querySelector('.action-move-down');
    moveDownButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Get updated rows
    const rowsAfterMoveDown = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    
    // Check row order is back to original
    expect(rowsAfterMoveDown[0].querySelector('td[data-field="name"] input').value).toBe('First Row');
    expect(rowsAfterMoveDown[1].querySelector('td[data-field="name"] input').value).toBe('Second Row');
    
    // Test delete - delete second row
    const deleteButton = rowsAfterMoveDown[1].querySelector('.action-delete');
    deleteButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Get updated rows
    const rowsAfterDelete = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    
    // Check row count and content
    expect(rowsAfterDelete.length).toBe(2);
    expect(rowsAfterDelete[0].querySelector('td[data-field="name"] input').value).toBe('First Row');
    expect(rowsAfterDelete[1].querySelector('td[data-field="name"] input').value).toBe('Third Row');
  });
  
  test('should toggle editing mode for rows', () => {
    const initialData = [{ name: 'Test Row', email: 'test@example.com' }];
    const { document, form, table } = setupCompleteForm(schema, initialData);
    
    // Get the row
    const row = table.querySelector('tbody tr:not(.array-row-template)');
    expect(row).toBeTruthy();
    
    // Initially not in editing mode
    expect(row.classList.contains('editing')).toBe(false);
    
    // Set up event listener to check if edit event is fired
    const editEventHandler = jest.fn();
    row.addEventListener('array:edit', editEventHandler);
    
    // Click edit button
    const editButton = row.querySelector('.action-edit');
    editButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Should be in editing mode now
    expect(row.classList.contains('editing')).toBe(true);
    expect(editEventHandler).toHaveBeenCalled();
    
    // Click edit button again to toggle off
    editButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Should be back to normal mode
    expect(row.classList.contains('editing')).toBe(false);
  });
  
  test('should handle simple string arrays', () => {
    const simpleListSchema = schema.properties.simpleList;
    const html = renderer.render(simpleListSchema, 'simple-list-table');
    
    // Set up DOM with rendered table
    const { document } = testEnv.setupDOM(`
      <div id="form-container">
        <form id="test-form">
          <h2>Simple List</h2>
          ${html}
        </form>
      </div>
    `);
    
    const table = document.getElementById('simple-list-table');
    setupArrayTable(table);
    
    // Should have one initial row
    let rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    expect(rows.length).toBe(1);
    
    // Add two more items
    const addButton = table.querySelector('.add-item');
    addButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    addButton.dispatchEvent(new testEnv.window.MouseEvent('click', { bubbles: true }));
    
    // Should have three rows now
    rows = Array.from(table.querySelectorAll('tbody tr')).filter(r => 
      !r.classList.contains('array-row-template')
    );
    expect(rows.length).toBe(3);
    
    // Fill in values
    rows[0].querySelector('td[data-field="value"] input').value = 'First Item';
    rows[1].querySelector('td[data-field="value"] input').value = 'Second Item';
    rows[2].querySelector('td[data-field="value"] input').value = 'Third Item';
    
    // Get data
    const data = getTableData(table, simpleListSchema);
    
    // Check data structure (should be array of strings)
    expect(data.length).toBe(3);
    expect(data[0]).toBe('First Item');
    expect(data[1]).toBe('Second Item');
    expect(data[2]).toBe('Third Item');
  });
}); 