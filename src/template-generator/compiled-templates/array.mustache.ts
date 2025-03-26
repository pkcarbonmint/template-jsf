
// Generated from template file: array.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateArrayMustache = `<div id="{{id}}" class="jsf-array" data-schema-type="array" data-schema-id="{{id}}" data-schema-path="{{id}}">
  {{#title}}
  <h3 class="jsf-object-title">{{title}}</h3>
  {{/title}}
  {{#description}}
  <p class="jsf-object-description">{{description}}</p>
  {{/description}}

  <div class="jsf-array-items">
    <!-- Array item template will be cloned and inserted here dynamically -->
    <div class="array-item-template hidden">
      <div class="jsf-array-item">
        <div class="jsf-array-item-content">
          {{{itemTemplate}}}
        </div>
        <button type="button" class="jsf-remove-btn" aria-label="Remove item">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <div class="jsf-array-buttons">
    <button type="button" class="jsf-add-btn">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      Add Item
    </button>
  </div>
</div> `;
export const genArrayMustache = renderMustache(templateArrayMustache);
