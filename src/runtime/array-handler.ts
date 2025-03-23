import $ from 'jquery';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import * as A from 'fp-ts/Array';

/**
 * Setup array handlers for all array containers in the form
 */
export function setupArrayHandlers(formElement: HTMLElement): void {
  // Find all array containers
  const arrayContainers = formElement.querySelectorAll('.array-container');
  
  arrayContainers.forEach(container => {
    setupArrayContainer(container as HTMLElement);
  });
}

/**
 * Setup a single array container with add/remove item functionality
 */
function setupArrayContainer(container: HTMLElement): void {
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
    const target = event.target as HTMLElement;
    const removeButton = target.closest('.remove-item');
    
    if (removeButton) {
      const arrayItem = removeButton.closest('.array-item');
      if (arrayItem) {
        removeArrayItem(container, arrayItem as HTMLElement);
      }
    }
  });
}

/**
 * Add a new array item to the container
 */
function addArrayItem(container: HTMLElement): HTMLElement {
  const itemsContainer = container.querySelector('.array-items');
  const itemTemplate = container.querySelector('.array-item-template');
  
  if (!itemsContainer || !itemTemplate) {
    console.warn('Cannot add array item, missing container or template');
    throw new Error('Cannot add array item, missing container or template');
  }
  
  // Clone the template
  const newItem = itemTemplate.cloneNode(true) as HTMLElement;
  
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
  updateFieldIdentifiers(arrayItemElement as HTMLElement, uniqueId);
  
  // Append the new item to the container
  itemsContainer.appendChild(newItem);
  
  // Initialize any nested arrays
  const nestedArrays = newItem.querySelectorAll('.array-container');
  nestedArrays.forEach(nestedArray => {
    setupArrayContainer(nestedArray as HTMLElement);
  });
  
  // Trigger any necessary events
  triggerArrayChangeEvent(container);
  
  return newItem;
}

/**
 * Remove an array item from the container
 */
function removeArrayItem(container: HTMLElement, item: HTMLElement): void {
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
    
    // Optionally, reset the form fields in the last item instead
    const inputs = item.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input instanceof HTMLInputElement) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = false;
        } else {
          input.value = '';
        }
      } else {
        (input as HTMLElement).innerText = '';
      }
    });
  }
}

/**
 * Update input IDs and names to make them unique
 */
function updateFieldIdentifiers(element: HTMLElement, uniqueId: string): void {
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
 * Trigger a custom event when array items change
 */
function triggerArrayChangeEvent(container: HTMLElement): void {
  const event = new CustomEvent('array:change', {
    bubbles: true,
    detail: {
      arrayId: container.id,
      container: container
    }
  });
  
  container.dispatchEvent(event);
}

/**
 * Get array items data from a container
 */
export function getArrayItemsData(container: HTMLElement): any[] {
  const itemsContainer = container.querySelector('.array-items');
  if (!itemsContainer) return [];
  
  // Get all visible items (not including the template)
  const visibleItems = Array.from(itemsContainer.children).filter(child => 
    !child.classList.contains('array-item-template') && 
    !child.classList.contains('hidden')
  );
  
  return visibleItems.map(item => {
    const itemData: Record<string, any> = {};
    const inputs = item.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input instanceof HTMLInputElement) {
        const name = input.name;
        if (!name) return;
        
        let value;
        if (input.type === 'checkbox') {
          value = input.checked;
        } else if (input.type === 'number' || input.type === 'range') {
          value = input.valueAsNumber;
        } else {
          value = input.value;
        }
        
        itemData[name] = value;
      } else {
        const name = input.getAttribute('name');
        if (!name) return;
        
        itemData[name] = (input as HTMLInputElement).value;
      }
    });
    
    return itemData;
  });
}

export default {
  setupArrayHandlers,
  getArrayItemsData
}; 