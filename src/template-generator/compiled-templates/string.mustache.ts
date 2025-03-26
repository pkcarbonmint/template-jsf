
// Generated from template file: string.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateStringMustache = `<div class="jsf-input-container">
  <input 
    type="text"
    id="{{id}}"
    name="{{id}}"
    class="jsf-input"
    data-schema-type="string"
    data-schema-id="{{id}}"
    data-schema-path="{{id}}"
    {{#required}}required{{/required}}
    {{#minLength}}data-minlength="{{minLength}}"{{/minLength}}
    {{#maxLength}}data-maxlength="{{maxLength}}"{{/maxLength}}
    {{#pattern}}data-pattern="{{pattern}}"{{/pattern}}
    {{#format}}data-format="{{format}}"{{/format}}
    {{#default}}value="{{default}}"{{/default}}
    placeholder=" "
  />
  <div class="jsf-focus-line"></div>
</div> `;
export const genStringMustache = renderMustache(templateStringMustache);
