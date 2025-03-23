/**
 * Array Table Handlers
 * 
 * This file contains functions for handling array tables in forms
 * - Add, edit, delete array items
 * - Modal form handling for array items
 * - Simple string array handling
 */

// Store array items for each array table
const arrayItems = {};

/**
 * Initialize array table handlers
 * Setup event listeners and initial state
 */
function initArrayTableHandlers() {
  // Initialize storage for each array
  document.querySelectorAll('.array-table-container').forEach(container => {
    const arrayName = container.getAttribute('data-array-name');
    if (arrayName) {
      arrayItems[arrayName] = [];
    }
  });
  
  // Initialize string array containers
  document.querySelectorAll('.string-array-container').forEach(container => {
    const arrayName = container.getAttribute('data-array-name');
    if (arrayName) {
      arrayItems[arrayName] = [];
    }
  });
  
  // Set up add item buttons
  document.querySelectorAll('.btn-add-item').forEach(button => {
    const arrayName = button.getAttribute('data-array-name');
    if (arrayName) {
      button.addEventListener('click', function() {
        openArrayItemModal(arrayName);
      });
    }
  });
  
  // Set up string array add buttons
  document.querySelectorAll('.btn-add-string-item').forEach(button => {
    const arrayName = button.getAttribute('data-array-name');
    if (arrayName) {
      button.addEventListener('click', function() {
        addStringArrayItem(arrayName);
      });
      
      // Set up enter key handling for string array inputs
      const input = document.getElementById(`${arrayName}-input`);
      if (input) {
        input.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            addStringArrayItem(arrayName);
          }
        });
      }
    }
  });
  
  // Set up modal close buttons
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
    button.addEventListener('click', function() {
      const modal = button.closest('.modal');
      if (modal) {
        closeModal(modal);
      }
    });
  });
  
  // Set up modal forms
  document.querySelectorAll('.modal-form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const arrayName = form.id.replace('-form', '');
      saveArrayItem(arrayName, form);
    });
  });
  
  // Close modal when clicking outside content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
  });
  
  // Catch ESC key to close modals
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        closeModal(openModal);
      }
    }
  });
}

/**
 * Open modal for adding/editing array item
 * @param {string} arrayName - Name of the array
 * @param {number} [index] - Index of item to edit (if editing)
 */
function openArrayItemModal(arrayName, index = -1) {
  const modal = document.getElementById(`${arrayName}-modal`);
  if (!modal) return;
  
  const form = document.getElementById(`${arrayName}-form`);
  if (!form) return;
  
  // Reset form
  form.reset();
  
  // Set index for editing
  const indexInput = document.getElementById(`${arrayName}-index`);
  if (indexInput) {
    indexInput.value = index;
  }
  
  // If editing, populate form with existing data
  if (index >= 0 && arrayItems[arrayName] && arrayItems[arrayName][index]) {
    const item = arrayItems[arrayName][index];
    
    // Populate each field
    Object.keys(item).forEach(key => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        input.value = item[key];
      }
    });
  }
  
  // Show modal
  modal.classList.add('show');
}

/**
 * Close modal
 * @param {HTMLElement} modal - Modal element to close
 */
function closeModal(modal) {
  modal.classList.remove('show');
}

/**
 * Save array item from modal form
 * @param {string} arrayName - Name of the array
 * @param {HTMLFormElement} form - Form element containing the data
 */
function saveArrayItem(arrayName, form) {
  // Get form data
  const formData = new FormData(form);
  const item = {};
  
  for (const [key, value] of formData.entries()) {
    if (key !== 'index') {
      item[key] = value;
    }
  }
  
  // Get index (for editing)
  const indexInput = document.getElementById(`${arrayName}-index`);
  const index = indexInput ? parseInt(indexInput.value) : -1;
  
  // Initialize array if not exists
  if (!arrayItems[arrayName]) {
    arrayItems[arrayName] = [];
  }
  
  // Add or update item
  if (index >= 0 && index < arrayItems[arrayName].length) {
    // Update existing item
    arrayItems[arrayName][index] = item;
  } else {
    // Add new item
    arrayItems[arrayName].push(item);
  }
  
  // Close modal
  const modal = document.getElementById(`${arrayName}-modal`);
  if (modal) {
    closeModal(modal);
  }
  
  // Update display
  renderArrayItems(arrayName);
}

/**
 * Delete array item
 * @param {string} arrayName - Name of the array
 * @param {number} index - Index of item to delete
 */
function deleteArrayItem(arrayName, index) {
  if (arrayItems[arrayName] && index >= 0 && index < arrayItems[arrayName].length) {
    // Remove item
    arrayItems[arrayName].splice(index, 1);
    
    // Update display
    renderArrayItems(arrayName);
  }
}

/**
 * Move array item up or down
 * @param {string} arrayName - Name of the array
 * @param {number} index - Index of item to move
 * @param {string} direction - Direction to move ('up' or 'down')
 */
function moveArrayItem(arrayName, index, direction) {
  if (!arrayItems[arrayName] || index < 0 || index >= arrayItems[arrayName].length) {
    return;
  }
  
  if (direction === 'up' && index > 0) {
    // Swap with previous item
    const temp = arrayItems[arrayName][index];
    arrayItems[arrayName][index] = arrayItems[arrayName][index - 1];
    arrayItems[arrayName][index - 1] = temp;
    
    // Update display
    renderArrayItems(arrayName);
  } else if (direction === 'down' && index < arrayItems[arrayName].length - 1) {
    // Swap with next item
    const temp = arrayItems[arrayName][index];
    arrayItems[arrayName][index] = arrayItems[arrayName][index + 1];
    arrayItems[arrayName][index + 1] = temp;
    
    // Update display
    renderArrayItems(arrayName);
  }
}

/**
 * Render array items in the table
 * @param {string} arrayName - Name of the array
 */
function renderArrayItems(arrayName) {
  const tbody = document.getElementById(`${arrayName}-items`);
  if (!tbody) return;
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  // Add rows for each item
  if (arrayItems[arrayName] && arrayItems[arrayName].length > 0) {
    arrayItems[arrayName].forEach((item, index) => {
      const row = document.createElement('tr');
      
      // Display data columns based on table headers
      const headers = tbody.closest('table').querySelectorAll('thead th');
      let columnCount = headers.length;
      
      // Add data cells (exclude the last column which is for actions)
      Array.from(headers).slice(0, -1).forEach(header => {
        const cell = document.createElement('td');
        
        // Try to find a property that matches the header text or a data attribute
        const headerText = header.textContent.trim().toLowerCase();
        const dataField = header.getAttribute('data-field');
        
        let value = '';
        if (dataField && item[dataField]) {
          value = item[dataField];
        } else {
          // Try to find a property name that matches or contains the header text
          const matchingKey = Object.keys(item).find(key => 
            key.toLowerCase() === headerText || 
            headerText.includes(key.toLowerCase()) || 
            key.toLowerCase().includes(headerText)
          );
          
          if (matchingKey) {
            value = item[matchingKey];
          }
        }
        
        cell.textContent = value;
        row.appendChild(cell);
      });
      
      // Add action buttons
      const actionsCell = document.createElement('td');
      actionsCell.className = 'array-table-actions';
      
      // Edit button
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'btn-edit';
      editButton.innerHTML = '<span class="action-icon">✏️</span>';
      editButton.title = 'Edit';
      editButton.addEventListener('click', function() {
        openArrayItemModal(arrayName, index);
      });
      actionsCell.appendChild(editButton);
      
      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-delete';
      deleteButton.innerHTML = '<span class="action-icon">🗑️</span>';
      deleteButton.title = 'Delete';
      deleteButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this item?')) {
          deleteArrayItem(arrayName, index);
        }
      });
      actionsCell.appendChild(deleteButton);
      
      // Move up button (if not first item)
      if (index > 0) {
        const moveUpButton = document.createElement('button');
        moveUpButton.type = 'button';
        moveUpButton.className = 'btn-move';
        moveUpButton.innerHTML = '<span class="action-icon">↑</span>';
        moveUpButton.title = 'Move Up';
        moveUpButton.addEventListener('click', function() {
          moveArrayItem(arrayName, index, 'up');
        });
        actionsCell.appendChild(moveUpButton);
      }
      
      // Move down button (if not last item)
      if (index < arrayItems[arrayName].length - 1) {
        const moveDownButton = document.createElement('button');
        moveDownButton.type = 'button';
        moveDownButton.className = 'btn-move';
        moveDownButton.innerHTML = '<span class="action-icon">↓</span>';
        moveDownButton.title = 'Move Down';
        moveDownButton.addEventListener('click', function() {
          moveArrayItem(arrayName, index, 'down');
        });
        actionsCell.appendChild(moveDownButton);
      }
      
      row.appendChild(actionsCell);
      tbody.appendChild(row);
    });
  } else {
    // No items message
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    
    cell.colSpan = tbody.closest('table').querySelectorAll('thead th').length;
    cell.className = 'empty-table-message';
    cell.textContent = 'No items added yet';
    
    row.appendChild(cell);
    tbody.appendChild(row);
  }
}

/**
 * Add a string array item
 * @param {string} arrayName - Name of the string array
 */
function addStringArrayItem(arrayName) {
  const input = document.getElementById(`${arrayName}-input`);
  if (!input) return;
  
  const value = input.value.trim();
  if (!value) return;
  
  // Initialize array if not exists
  if (!arrayItems[arrayName]) {
    arrayItems[arrayName] = [];
  }
  
  // Add item if not duplicate
  if (!arrayItems[arrayName].includes(value)) {
    arrayItems[arrayName].push(value);
    
    // Update display
    renderStringArrayItems(arrayName);
    
    // Clear input
    input.value = '';
    input.focus();
  }
}

/**
 * Delete a string array item
 * @param {string} arrayName - Name of the string array
 * @param {number} index - Index of item to delete
 */
function deleteStringArrayItem(arrayName, index) {
  if (arrayItems[arrayName] && index >= 0 && index < arrayItems[arrayName].length) {
    // Remove item
    arrayItems[arrayName].splice(index, 1);
    
    // Update display
    renderStringArrayItems(arrayName);
  }
}

/**
 * Render string array items
 * @param {string} arrayName - Name of the string array
 */
function renderStringArrayItems(arrayName) {
  const container = document.getElementById(`${arrayName}-items`);
  if (!container) return;
  
  // Clear existing items
  container.innerHTML = '';
  
  // Add items
  if (arrayItems[arrayName] && arrayItems[arrayName].length > 0) {
    arrayItems[arrayName].forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'string-array-item';
      
      const text = document.createElement('span');
      text.className = 'string-item-text';
      text.textContent = item;
      itemElement.appendChild(text);
      
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-remove-string-item';
      deleteButton.innerHTML = '×';
      deleteButton.title = 'Remove';
      deleteButton.addEventListener('click', function() {
        deleteStringArrayItem(arrayName, index);
      });
      itemElement.appendChild(deleteButton);
      
      container.appendChild(itemElement);
    });
  }
}

/**
 * Get all items for an array
 * @param {string} arrayName - Name of the array
 * @returns {Array} The array items
 */
function getArrayItems(arrayName) {
  return arrayItems[arrayName] || [];
}

/**
 * Get all items for a string array
 * @param {string} arrayName - Name of the string array
 * @returns {Array<string>} The string array items
 */
function getStringArrayItems(arrayName) {
  return arrayItems[arrayName] || [];
}

/**
 * Set array items directly
 * @param {string} arrayName - Name of the array
 * @param {Array} items - Array items to set
 */
function setArrayItems(arrayName, items) {
  if (Array.isArray(items)) {
    arrayItems[arrayName] = items;
    renderArrayItems(arrayName);
  }
}

/**
 * Set string array items directly
 * @param {string} arrayName - Name of the string array
 * @param {Array<string>} items - String array items to set
 */
function setStringArrayItems(arrayName, items) {
  if (Array.isArray(items)) {
    arrayItems[arrayName] = items;
    renderStringArrayItems(arrayName);
  }
} 