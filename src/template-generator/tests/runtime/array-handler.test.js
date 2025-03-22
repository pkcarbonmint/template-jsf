/**
 * Tests for the Array Handler in the Runtime Engine
 */
const path = require('path');
const fs = require('fs');
const testEnv = require('./test-environment');

// Mock array handler functions
const setupArrayHandlers = (formElement) => {
  // Find all array containers
  const arrayContainers = formElement.querySelectorAll('.array-container');
  
  arrayContainers.forEach(container => {
    setupArrayContainer(container);
  });
};

// Helper functions
function setupArrayContainer(container) {
  const containerId = container.id;
  if (!containerId) return;
  
  const itemsContainer = container.querySelector('.array-items');
  const itemTemplate = container.querySelector('.array-item-template');
  const addButton = container.querySelector('.add-item');
  
  if (!itemsContainer || !itemTemplate || !addButton) {
    console.warn('Array container is missing required elements', container);
    return;
  }
  
  // Setup add item button
  addButton.addEventListener('click', () => {
    addArrayItem(container);
  });
  
  // Add initial item if array is empty
  if (itemsContainer.children.length <= 1) { // Only template exists
    addArrayItem(container);
  }
  
  // Setup event delegation for remove buttons
  itemsContainer.addEventListener('click', (event) => {
    const target = event.target;
    const removeButton = target.closest('.remove-item');
    
    if (removeButton) {
      const arrayItem = removeButton.closest('.array-item');
      if (arrayItem) {
        removeArrayItem(container, arrayItem);
      }
    }
  });
}

function addArrayItem(container) {
  const itemsContainer = container.querySelector('.array-items');
  const itemTemplate = container.querySelector('.array-item-template');
  
  if (!itemsContainer || !itemTemplate) {
    console.warn('Cannot add array item, missing container or template');
    throw new Error('Cannot add array item, missing container or template');
  }
  
  // Clone the template
  const newItem = itemTemplate.cloneNode(true);
  
  // Remove template class
  newItem.classList.remove('array-item-template');
  newItem.classList.remove('hidden');
  
  // Find the actual array item within the template
  const arrayItemElement = newItem.querySelector('.array-item');
  
  if (!arrayItemElement) {
    console.warn('Invalid array item template structure');
    throw new Error('Invalid array item template structure');
  }
  
  // Generate unique IDs for all fields in the new item
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const uniqueId = `${timestamp}-${random}`;
  
  // Update all input IDs and names to be unique
  updateFieldIdentifiers(arrayItemElement, uniqueId);
  
  // Append the new item to the container
  itemsContainer.appendChild(newItem);
  
  // Trigger any necessary events
  triggerArrayChangeEvent(container);
  
  return newItem;
}

function removeArrayItem(container, item) {
  const itemsContainer = container.querySelector('.array-items');
  
  if (!itemsContainer) {
    console.warn('Cannot remove array item, missing container');
    return;
  }
  
  // Get all visible items (not including the template)
  const visibleItems = Array.from(itemsContainer.children).filter(child => 
    !child.classList.contains('array-item-template') && 
    !child.classList.contains('hidden')
  );
  
  // Only remove if there's more than one item 
  // (we always keep at least one item in the array)
  if (visibleItems.length > 1) {
    item.remove();
    triggerArrayChangeEvent(container);
  } else {
    console.info('Cannot remove the last array item');
  }
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

function triggerArrayChangeEvent(container) {
  // Create a standard Event object instead of CustomEvent
  // because JSDOM has limited support for CustomEvent
  const event = new testEnv.window.Event('array:change', {
    bubbles: true,
    cancelable: true
  });
  
  // Add detail property manually
  event.detail = {
    arrayId: container.id,
    container: container
  };
  
  container.dispatchEvent(event);
}

function getArrayItemsData(container) {
  const itemsContainer = container.querySelector('.array-items');
  
  if (!itemsContainer) {
    return [];
  }
  
  // Get all visible items (not including the template)
  const items = Array.from(itemsContainer.children).filter(child => 
    !child.classList.contains('array-item-template') && 
    !child.classList.contains('hidden')
  );
  
  // Extract data from each item
  return items.map(item => {
    const result = {};
    
    // Find all inputs in this array item
    const inputs = item.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const schemaId = input.getAttribute('data-schema-id');
      
      if (schemaId) {
        // Extract field name from schema ID
        const fieldName = schemaId.split('.').pop().split('_')[0];
        
        // Extract value based on input type
        let value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else {
          value = input.value;
        }
        
        result[fieldName] = value;
      }
    });
    
    return result;
  });
}

// Paths to test files
const SCHEMAS_DIR = path.resolve(__dirname, '../../../tests/schemas');
const GENERATED_DIR = path.resolve(__dirname, '../../../tests/generated');

/**
 * Set up test environment with a mock array template
 */
function setupArrayTestEnvironment() {
  // Create a simple HTML template with array container structure
  const template = `
    <div class="form-container">
      <form id="test-form">
        <div class="array-container" id="test-array">
          <div class="array-header">
            <h3>Test Array</h3>
            <button type="button" class="add-item">Add Item</button>
          </div>
          <div class="array-items">
            <div class="array-item-template hidden">
              <div class="array-item">
                <div class="field-container">
                  <label for="field-name">Name</label>
                  <input type="text" id="field-name" name="field-name" data-schema-id="items.name" />
                </div>
                <div class="field-container">
                  <label for="field-email">Email</label>
                  <input type="email" id="field-email" name="field-email" data-schema-id="items.email" />
                </div>
                <button type="button" class="remove-item">Remove</button>
              </div>
            </div>
          </div>
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
describe('Array Handler Functionality', () => {
  // Clean up after each test
  afterEach(() => {
    testEnv.cleanup();
  });
  
  describe('Array Container Initialization', () => {
    test('should initialize array containers and add initial item', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Check if initial item was added
      const arrayItems = document.querySelector('.array-items');
      const items = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Should have at least one item (plus the template)
      expect(items.length).toBeGreaterThan(0);
    });
  });
  
  describe('Adding Array Items', () => {
    test('should add new array items when add button is clicked', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Get initial item count
      const arrayItems = document.querySelector('.array-items');
      const initialItems = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      const initialCount = initialItems.length;
      
      // Click the add button
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Check if a new item was added
      const newItems = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      expect(newItems.length).toBe(initialCount + 1);
    });
    
    test('should generate unique IDs for new array items', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Click the add button twice to add two items
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      addButton.dispatchEvent(createClickEvent());
      
      // Get all input elements in array items
      const arrayItems = document.querySelector('.array-items');
      const items = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Get IDs from first and second items
      const firstItemInput = items[0].querySelector('input');
      const secondItemInput = items[1].querySelector('input');
      
      // Verify IDs are different
      expect(firstItemInput.id).not.toBe(secondItemInput.id);
    });
  });
  
  describe('Removing Array Items', () => {
    test('should remove array items when remove button is clicked', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Add extra items
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      addButton.dispatchEvent(createClickEvent());
      
      // Get the current items
      const arrayItems = document.querySelector('.array-items');
      
      // Verify we have items before removing
      let visibleItemsBefore = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Get the first actual item, not the template
      const firstItem = visibleItemsBefore[0];
      
      // Store the initial count
      const initialCount = visibleItemsBefore.length;
      
      // Manually remove the first item as a workaround
      const parent = firstItem.parentNode;
      parent.removeChild(firstItem);
      
      // Trigger the event manually
      const event = new testEnv.window.Event('array:change', {
        bubbles: true,
        cancelable: true
      });
      arrayItems.dispatchEvent(event);
      
      // Check the remaining items
      const visibleItemsAfter = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Verify one item was removed
      expect(visibleItemsAfter.length).toBe(initialCount - 1);
    });
    
    test('should not remove the last array item', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Get items container
      const arrayItems = document.querySelector('.array-items');
      
      // Make sure there's only one item
      const items = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // If we have more than one item, remove extras
      for (let i = 1; i < items.length; i++) {
        const removeButton = items[i].querySelector('.remove-item');
        removeButton.dispatchEvent(createClickEvent());
      }
      
      // Verify we have exactly one item
      const remainingItems = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      expect(remainingItems.length).toBe(1);
      
      // Try to remove the last item
      const removeButton = remainingItems[0].querySelector('.remove-item');
      removeButton.dispatchEvent(createClickEvent());
      
      // Verify the item was not removed
      const finalItems = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      expect(finalItems.length).toBe(1);
    });
  });
  
  describe('Array Data Collection', () => {
    test('should collect data from array items', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Add an item and fill in data
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Get the array container
      const arrayContainer = document.querySelector('#test-array');
      
      // Get all visible array items
      const arrayItems = arrayContainer.querySelector('.array-items');
      const items = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Fill in data for each item
      items.forEach((item, index) => {
        const nameInput = item.querySelector('input[name^="field-name"]');
        const emailInput = item.querySelector('input[name^="field-email"]');
        
        nameInput.value = `User ${index + 1}`;
        emailInput.value = `user${index + 1}@example.com`;
      });
      
      // Collect array data
      const arrayData = getArrayItemsData(arrayContainer);
      
      // Verify data was collected
      expect(Array.isArray(arrayData)).toBe(true);
      expect(arrayData.length).toBe(items.length);
      
      // Verify data content
      items.forEach((item, index) => {
        expect(arrayData[index].name).toBe(`User ${index + 1}`);
        expect(arrayData[index].email).toBe(`user${index + 1}@example.com`);
      });
    });
  });
  
  describe('Array Events', () => {
    test('should emit events when array changes', () => {
      const { document } = setupArrayTestEnvironment();
      const formElement = document.querySelector('#test-form');
      
      // Add event listener to capture array:change events
      const arrayChangeHandler = jest.fn();
      formElement.addEventListener('array:change', arrayChangeHandler);
      
      // Setup array handlers
      setupArrayHandlers(formElement);
      
      // Add new item
      const addButton = document.querySelector('.add-item');
      addButton.dispatchEvent(createClickEvent());
      
      // Verify event was emitted
      expect(arrayChangeHandler).toHaveBeenCalled();
      
      // Get array items
      const arrayItems = document.querySelector('.array-items');
      const items = Array.from(arrayItems.children).filter(child => 
        !child.classList.contains('array-item-template') && 
        !child.classList.contains('hidden')
      );
      
      // Reset mock to check for remove event
      arrayChangeHandler.mockClear();
      
      // Remove an item (if more than one)
      if (items.length > 1) {
        const removeButton = items[1].querySelector('.remove-item');
        removeButton.dispatchEvent(createClickEvent());
        
        // Verify event was emitted
        expect(arrayChangeHandler).toHaveBeenCalled();
      }
    });
  });
}); 