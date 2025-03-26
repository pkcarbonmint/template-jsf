
// Generated from template file: object.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateObjectMustache = `<div class="jsf-object" id="{{id}}" data-schema-id="{{id}}" data-schema-path="{{id}}">
  {{#title}}
  <h2 class="jsf-object-title">{{title}}</h2>
  {{/title}}
  {{#description}}
  <p class="jsf-object-description">{{description}}</p>
  {{/description}}
  <div class="jsf-object-content">
    {{{properties}}}
    {{{conditionals}}}
  </div>
</div> `;
export const genObjectMustache = renderMustache(templateObjectMustache);
