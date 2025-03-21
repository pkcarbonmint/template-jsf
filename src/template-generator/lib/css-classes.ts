/**
 * CSS class mappings for template generation
 * This file provides standardized CSS classes to reduce template size
 */

// Form component classes
export const formClasses = {
  container: 'w-full max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg',
  title: 'text-3xl font-medium mb-8 text-gray-800',
  buttonContainer: 'mt-10 flex justify-end',
  submitButton: 'px-6 py-2.5 bg-blue-500 text-white rounded shadow-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-colors duration-200 uppercase text-sm font-medium tracking-wider'
};

// Property container classes
export const propertyClasses = {
  container: 'property-container mb-5',
  label: 'block mb-2',
  labelText: 'text-gray-700 font-medium text-sm tracking-wide',
  required: 'text-red-500',
  description: 'block text-xs text-gray-500 mt-1 mb-1'
};

// Input field classes (for text, number, email, etc.)
export const inputClasses = {
  container: 'relative',
  field: 'w-full px-4 py-3 border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:ring-0 bg-gray-50 rounded-t-md transition-colors duration-200',
  focusIndicator: 'h-0.5 w-0 bg-blue-500 transition-all duration-200 group-focus-within:w-full'
};

// Object container classes
export const objectClasses = {
  container: 'schema-object bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200',
  title: 'text-xl font-medium mb-6 text-gray-700 border-b border-gray-200 pb-2',
  description: 'text-sm text-gray-600 mb-6',
  content: 'space-y-6'
};

// Array container classes
export const arrayClasses = {
  container: 'schema-array',
  itemsContainer: 'mt-2 space-y-4',
  item: 'flex items-start',
  itemContent: 'flex-grow',
  buttonContainer: 'flex justify-between mt-4',
  addButton: 'px-4 py-2 bg-green-500 text-white rounded shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-50 transition-colors duration-200',
  removeButton: 'ml-2 p-2 bg-red-500 text-white rounded shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 transition-colors duration-200'
};

// Function to convert object of class definitions to a single class string
export function classesToString(classObj: Record<string, string>): string {
  return Object.values(classObj).join(' ');
}

// Functions to get specific class strings
export function getFormClasses(component: keyof typeof formClasses): string {
  return formClasses[component];
}

export function getPropertyClasses(component: keyof typeof propertyClasses): string {
  return propertyClasses[component];
}

export function getInputClasses(component: keyof typeof inputClasses): string {
  return inputClasses[component];
}

export function getObjectClasses(component: keyof typeof objectClasses): string {
  return objectClasses[component];
}

export function getArrayClasses(component: keyof typeof arrayClasses): string {
  return arrayClasses[component];
} 