// filepath: tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx,scss}",
    "./generated-templates/**/*.{html,js}",
  ],
  safelist: [
    "jsf-form",
    "jsf-title",
    "jsf-object",
    "jsf-object-title",
    "jsf-object-desc",
    "jsf-prop",
    "jsf-label",
    "jsf-label-text",
    "jsf-required",
    "jsf-desc",
    "jsf-input-container",
    "jsf-input",
    "jsf-focus-line",
    "jsf-btn-container",
    "jsf-submit-btn",
    "jsf-array",
    "jsf-array-items",
    "jsf-add-btn",
    "jsf-remove-btn",
    // Add any other custom classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};