/**
 * Layout Handlers
 * 
 * This file contains functions for handling layout elements like tabs and wizards
 */

/**
 * Initialize tab handlers
 * Handles horizontal and vertical tab layouts
 */
function initTabHandlers() {
  // Get all tab containers
  const tabContainers = document.querySelectorAll('.tabs-container');
  
  tabContainers.forEach(container => {
    const tabLayout = container.getAttribute('data-tab-layout') || 'horizontal';
    const tabNavItems = container.querySelectorAll('.tab-item');
    
    // Add click event to each tab navigation item
    tabNavItems.forEach(tabItem => {
      tabItem.addEventListener('click', function() {
        const targetId = this.getAttribute('data-tab-target');
        
        // Remove active class from all tabs in this container
        container.querySelectorAll('.tab-item').forEach(item => {
          item.classList.remove('active');
        });
        
        // Remove active class from all tab panes
        container.closest('form').querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        
        // Add active class to clicked tab and corresponding pane
        this.classList.add('active');
        document.getElementById(targetId).classList.add('active');
      });
    });
  });
}

/**
 * Initialize vertical tabs
 * Special handling for vertical tab layouts
 */
function initVerticalTabs() {
  const verticalTabContainers = document.querySelectorAll('.tabs-container[data-tab-layout="vertical"]');
  
  verticalTabContainers.forEach(container => {
    // Initialize first tab as active if none is active
    if (!container.querySelector('.tab-item.active')) {
      const firstTab = container.querySelector('.tab-item');
      if (firstTab) {
        const firstTabId = firstTab.getAttribute('data-tab-target');
        firstTab.classList.add('active');
        document.getElementById(firstTabId).classList.add('active');
      }
    }
  });
}

/**
 * Initialize wizard handlers
 * Manages multi-step forms with navigation
 */
function initWizardHandlers() {
  const wizardContainers = document.querySelectorAll('.wizard-container');
  
  wizardContainers.forEach(wizard => {
    // Initialize first step if none is active
    if (!wizard.querySelector('.wizard-page.active')) {
      const firstPage = wizard.querySelector('.wizard-page');
      if (firstPage) {
        firstPage.classList.add('active');
      }
    }
    
    // Initialize step indicators
    const steps = wizard.querySelectorAll('.wizard-step');
    const activePage = wizard.querySelector('.wizard-page.active');
    
    if (activePage) {
      const activeStep = parseInt(activePage.getAttribute('data-page'));
      
      steps.forEach(step => {
        const stepNum = parseInt(step.getAttribute('data-step'));
        
        if (stepNum === activeStep) {
          step.classList.add('active');
        } else if (stepNum < activeStep) {
          step.classList.add('completed');
        }
      });
      
      // Update progress bar
      const progressBar = wizard.querySelector('.progress-indicator');
      if (progressBar) {
        const totalSteps = steps.length;
        const progressPercentage = ((activeStep - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progressPercentage}%`;
      }
    }
  });
}

/**
 * Initialize conditional visibility
 * Handles showing/hiding form elements based on conditions
 */
function initConditionalVisibility() {
  const conditionalTriggers = document.querySelectorAll('[data-condition-trigger]');
  
  conditionalTriggers.forEach(trigger => {
    const updateConditions = () => {
      const triggerName = trigger.name;
      const triggerValue = getElementValue(trigger);
      
      // Find all elements that depend on this trigger
      const dependents = document.querySelectorAll(`[data-condition-field="${triggerName}"]`);
      
      dependents.forEach(dependent => {
        const conditionValue = dependent.getAttribute('data-condition-value');
        const conditionOperator = dependent.getAttribute('data-condition-operator') || 'equals';
        
        // Evaluate the condition
        let conditionMet = false;
        
        switch (conditionOperator) {
          case 'equals':
            if (Array.isArray(triggerValue)) {
              conditionMet = triggerValue.includes(conditionValue);
            } else {
              conditionMet = triggerValue == conditionValue;
            }
            break;
          case 'not-equals':
            if (Array.isArray(triggerValue)) {
              conditionMet = !triggerValue.includes(conditionValue);
            } else {
              conditionMet = triggerValue != conditionValue;
            }
            break;
          case 'contains':
            conditionMet = String(triggerValue).includes(conditionValue);
            break;
          case 'greater-than':
            conditionMet = Number(triggerValue) > Number(conditionValue);
            break;
          case 'less-than':
            conditionMet = Number(triggerValue) < Number(conditionValue);
            break;
          case 'not-empty':
            conditionMet = triggerValue !== '' && triggerValue !== null && triggerValue !== undefined;
            break;
          case 'empty':
            conditionMet = triggerValue === '' || triggerValue === null || triggerValue === undefined;
            break;
        }
        
        // Show or hide the dependent element
        if (conditionMet) {
          dependent.classList.remove('hidden');
          
          // Re-enable form fields within the now-visible section
          const formFields = dependent.querySelectorAll('input, select, textarea');
          formFields.forEach(field => {
            if (field.hasAttribute('data-original-required')) {
              field.required = true;
              field.removeAttribute('data-original-required');
            }
            field.disabled = false;
          });
        } else {
          dependent.classList.add('hidden');
          
          // Disable form fields within the hidden section
          const formFields = dependent.querySelectorAll('input, select, textarea');
          formFields.forEach(field => {
            if (field.required) {
              field.setAttribute('data-original-required', 'true');
              field.required = false;
            }
            field.disabled = true;
          });
        }
      });
    };
    
    // Initial update
    updateConditions();
    
    // Add event listeners
    if (trigger.type === 'checkbox' || trigger.type === 'radio') {
      trigger.addEventListener('change', updateConditions);
    } else {
      trigger.addEventListener('change', updateConditions);
      trigger.addEventListener('input', updateConditions);
    }
  });
}

/**
 * Get the value of an element
 * Handles different input types
 */
function getElementValue(element) {
  if (!element) return null;
  
  if (element.type === 'checkbox') {
    if (element.name.endsWith('[]')) {
      // Multiple checkboxes with the same name
      const checkboxes = document.querySelectorAll(`input[name="${element.name}"]:checked`);
      return Array.from(checkboxes).map(cb => cb.value);
    } else {
      return element.checked;
    }
  } else if (element.type === 'radio') {
    const radioGroup = document.querySelectorAll(`input[name="${element.name}"]:checked`);
    return radioGroup.length ? radioGroup[0].value : null;
  } else if (element.tagName === 'SELECT' && element.multiple) {
    return Array.from(element.selectedOptions).map(option => option.value);
  } else {
    return element.value;
  }
}

// Initialize all handlers when document is ready
document.addEventListener('DOMContentLoaded', function() {
  initTabHandlers();
  initVerticalTabs();
  initWizardHandlers();
  initConditionalVisibility();
}); 