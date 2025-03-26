
// Generated from template file: property.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templatePropertyMustache = `<div class="jsf-prop" data-property-name="{{name}}" data-schema-path="{{name}}">
  <label class="jsf-label">
    <span class="jsf-label-text">
      {{title}}
      {{#required}}<span class="jsf-required">*</span>{{/required}}
    </span>
    {{#description}}
    <span class="jsf-desc">{{description}}</span>
    {{/description}}
  </label>
  {{{content}}}
</div> `;
export const genPropertyMustache = renderMustache(templatePropertyMustache);
