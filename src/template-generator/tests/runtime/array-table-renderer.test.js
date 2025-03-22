/**
 * Tests for the Array Table Renderer
 */
const fs = require('fs');
const path = require('path');
const ArrayTableRenderer = require('../../runtime/array-table-renderer');
const testEnv = require('./test-environment');

// Load test schema
const schemaPath = path.resolve(__dirname, '../schemas/array-table-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

describe('Array Table Renderer', () => {
  let renderer;
  
  beforeEach(() => {
    renderer = new ArrayTableRenderer();
    
    // Mock the file system reading for the template
    jest.spyOn(fs, 'readFileSync').mockImplementation((filePath) => {
      if (filePath.includes('array-table.mustache')) {
        return `
          <table class="array-table" id="{{containerId}}">
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
                  {{#isEdit}}<button class="action-edit">Edit</button>{{/isEdit}}
                  {{#isDelete}}<button class="action-delete">Delete</button>{{/isDelete}}
                  {{#isMoveUp}}<button class="action-move-up">Up</button>{{/isMoveUp}}
                  {{#isMoveDown}}<button class="action-move-down">Down</button>{{/isMoveDown}}
                  {{/actions}}
                </td>
                {{/isActionColumn}}
                {{^isActionColumn}}
                <td data-field="{{field}}">
                  {{#isBoolean}}<input type="checkbox" />{{/isBoolean}}
                  {{#isNumber}}<input type="number" />{{/isNumber}}
                  {{#isString}}<input type="text" />{{/isString}}
                </td>
                {{/isActionColumn}}
                {{/columns}}
              </tr>
            </tbody>
          </table>
        `;
      }
      return '';
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    testEnv.cleanup();
  });
  
  test('should render a table with columns from schema', () => {
    const contactsSchema = schema.properties.contacts;
    const html = renderer.render(contactsSchema, 'contacts-table');
    
    // Set up a DOM with the rendered HTML
    const { document } = testEnv.setupDOM(`<div id="container">${html}</div>`);
    
    // Check the table structure
    const table = document.querySelector('.array-table');
    expect(table).toBeTruthy();
    expect(table.id).toBe('contacts-table');
    
    // Check headers
    const headers = Array.from(table.querySelectorAll('thead th'));
    expect(headers.length).toBe(7); // All columns from schema
    
    // Check header labels match schema
    expect(headers[0].textContent).toBe('Name');
    expect(headers[1].textContent).toBe('Email');
    
    // Check template row
    const templateRow = table.querySelector('.array-row-template');
    expect(templateRow).toBeTruthy();
    
    // Check cells
    const cells = templateRow.querySelectorAll('td');
    expect(cells.length).toBe(7); // All columns
    
    // Check action buttons
    const actionCell = templateRow.querySelector('td.actions');
    expect(actionCell).toBeTruthy();
    
    const actionButtons = actionCell.querySelectorAll('button');
    expect(actionButtons.length).toBe(4); // edit, delete, moveUp, moveDown
  });
  
  test('should handle simple string arrays', () => {
    const simpleListSchema = schema.properties.simpleList;
    const html = renderer.render(simpleListSchema, 'simple-list-table');
    
    // Set up a DOM with the rendered HTML
    const { document } = testEnv.setupDOM(`<div id="container">${html}</div>`);
    
    // Check the table structure
    const table = document.querySelector('.array-table');
    expect(table).toBeTruthy();
    
    // Check headers
    const headers = Array.from(table.querySelectorAll('thead th'));
    expect(headers.length).toBe(2); // value and actions
    
    // Check header labels
    expect(headers[0].textContent).toBe('Value');
    expect(headers[1].textContent).toBe('Actions');
  });
  
  test('should prepare columns with correct type information', () => {
    const contactsSchema = schema.properties.contacts;
    const columns = renderer.prepareColumns(contactsSchema);
    
    // Check column count
    expect(columns.length).toBe(7);
    
    // Check name column
    const nameColumn = columns.find(col => col.field === 'name');
    expect(nameColumn.isString).toBe(true);
    expect(nameColumn.isNumber).toBeFalsy();
    expect(nameColumn.isActionColumn).toBe(false);
    
    // Check age column
    const ageColumn = columns.find(col => col.field === 'age');
    expect(ageColumn.isNumber).toBe(true);
    expect(ageColumn.isString).toBeFalsy();
    
    // Check status column (enum)
    const statusColumn = columns.find(col => col.field === 'status');
    expect(statusColumn.isEnum).toBe(true);
    expect(statusColumn.options.length).toBe(3);
    expect(statusColumn.options[0].value).toBe('active');
    expect(statusColumn.options[0].label).toBe('Active');
    
    // Check actions column
    const actionsColumn = columns.find(col => col.field === 'actions');
    expect(actionsColumn.isActionColumn).toBe(true);
    expect(actionsColumn.actions.length).toBe(4);
    
    // Verify action flags
    const editAction = actionsColumn.actions.find(a => a.name === 'edit');
    expect(editAction.isEdit).toBe(true);
    expect(editAction.isDelete).toBeFalsy();
  });
  
  test('should create view model from data', () => {
    const contactsSchema = schema.properties.contacts;
    const data = [
      { name: 'John Doe', email: 'john@example.com', age: 30 },
      { name: 'Jane Smith', email: 'jane@example.com', age: 25 }
    ];
    
    const viewModel = renderer.createViewModel(contactsSchema, data);
    
    // Check structure
    expect(viewModel.rows.length).toBe(2);
    expect(viewModel.rows[0].data).toEqual(data[0]);
    expect(viewModel.rows[1].data).toEqual(data[1]);
  });
  
  test('should parse form data from table', () => {
    // Create a mock table with data
    const { document } = testEnv.setupDOM(`
      <table class="array-table" id="test-table">
        <tbody>
          <tr>
            <td data-field="name"><input type="text" value="John Doe" /></td>
            <td data-field="email"><input type="email" value="john@example.com" /></td>
            <td data-field="age"><input type="number" value="30" /></td>
            <td data-field="isVIP"><input type="checkbox" checked /></td>
            <td class="actions">
              <button class="action-edit">Edit</button>
            </td>
          </tr>
          <tr>
            <td data-field="name"><input type="text" value="Jane Smith" /></td>
            <td data-field="email"><input type="email" value="jane@example.com" /></td>
            <td data-field="age"><input type="number" value="25" /></td>
            <td data-field="isVIP"><input type="checkbox" /></td>
            <td class="actions">
              <button class="action-edit">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    `);
    
    const table = document.querySelector('#test-table');
    const contactsSchema = schema.properties.contacts;
    
    const data = renderer.parseFormData(table, contactsSchema);
    
    // Check parsed data
    expect(data.length).toBe(2);
    expect(data[0].name).toBe('John Doe');
    expect(data[0].email).toBe('john@example.com');
    expect(data[0].age).toBe(30); // Converted to number
    expect(data[0].isVIP).toBe(true);
    
    expect(data[1].name).toBe('Jane Smith');
    expect(data[1].email).toBe('jane@example.com');
    expect(data[1].age).toBe(25); // Converted to number
    expect(data[1].isVIP).toBe(false);
  });
  
  test('should handle simple string arrays in parseFormData', () => {
    // Create a mock table with data
    const { document } = testEnv.setupDOM(`
      <table class="array-table" id="test-simple-table">
        <tbody>
          <tr>
            <td data-field="value"><input type="text" value="Item 1" /></td>
            <td class="actions">
              <button class="action-delete">Delete</button>
            </td>
          </tr>
          <tr>
            <td data-field="value"><input type="text" value="Item 2" /></td>
            <td class="actions">
              <button class="action-delete">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    `);
    
    const table = document.querySelector('#test-simple-table');
    const simpleListSchema = schema.properties.simpleList;
    
    const data = renderer.parseFormData(table, simpleListSchema);
    
    // Check parsed data
    expect(data.length).toBe(2);
    expect(data[0]).toBe('Item 1');
    expect(data[1]).toBe('Item 2');
  });
}); 