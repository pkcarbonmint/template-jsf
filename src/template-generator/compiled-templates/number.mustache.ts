
// Generated from template file: number.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateNumberMustache = `<div class="jsf-input-container">
  <input 
    type="number"
    id="{{id}}"
    name="{{id}}"
    class="jsf-input"
    data-schema-type="number"
    data-schema-id="{{id}}"
    data-schema-path="{{id}}"
    {{#required}}required{{/required}}
    {{#minimum}}min="{{minimum}}"{{/minimum}}
    {{#maximum}}max="{{maximum}}"{{/maximum}}
    {{#default}}value="{{default}}"{{/default}}
    {{#step}}step="{{step}}"{{/step}}
    placeholder=" "
  />
  <div class="jsf-focus-line"></div>
</div> `;
export const genNumberMustache = renderMustache(templateNumberMustache);
