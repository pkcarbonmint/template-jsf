
// Generated from template file: object-wizard.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateObjectWizardMustache = `<div id="{{id}}" data-schema-id="{{id}}" class="wizard-container">
  <h3 class="text-2xl font-semibold mb-4">{{title}}</h3>
  <p class="text-gray-600 mb-4">{{description}}</p>

  <!-- Step Indicators -->
  <div class="steps">
    {{#properties}}
      <div class="step" data-step-id="{{id}}-{{name}}">
        <span class="step-number">{{@index}}</span>
        <span class="step-title">{{title}}</span>
      </div>
    {{/properties}}
  </div>

  <!-- Wizard Steps -->
  <div class="wizard">
    {{#properties}}
      <div class="wizard-step" id="{{id}}-{{name}}">
        <h4 class="text-lg font-medium mb-2">{{title}}</h4>
        {{{content}}}
      </div>
    {{/properties}}
  </div>

  <!-- Navigation Buttons -->
  <div class="navigation">
    <button class="prev-btn bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center">
      Previous
    </button>
    <button class="next-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center">
      Next
    </button>
  </div>

  {{{conditionals}}}
</div>
`;
export const genObjectWizardMustache = renderMustache(templateObjectWizardMustache);
