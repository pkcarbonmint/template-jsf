
// Generated from template file: date.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateDateMustache = `<div class="relative">
  <input 
    type="date"
    id="{{id}}"
    name="{{id}}"
    class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
    data-schema-type="date"
    data-schema-id="{{id}}"
    data-schema-path="{{id}}"
    {{#required}}required{{/required}}
    {{#default}}value="{{default}}"{{/default}}
  />
  <div class="h-0.5 w-0 bg-blue-500 transition-all duration-200 group-focus-within:w-full"></div>
</div> `;
export const genDateMustache = renderMustache(templateDateMustache);
