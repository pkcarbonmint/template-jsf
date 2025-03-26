
// Generated from template file: textarea.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateTextareaMustache = `<div class="relative">
  <textarea
    id="{{id}}"
    name="{{id}}"
    class="w-full px-4 py-3 border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:ring-0 bg-gray-50 rounded-t-md transition-colors duration-200 resize-y min-h-[120px]"
    data-schema-type="string"
    data-schema-id="{{id}}"
    data-schema-path="{{id}}"
    {{#required}}required{{/required}}
    {{#minLength}}data-minlength="{{minLength}}"{{/minLength}}
    {{#maxLength}}data-maxlength="{{maxLength}}"{{/maxLength}}
    placeholder=" "
  >{{#default}}{{default}}{{/default}}</textarea>
  <div class="h-0.5 w-0 bg-blue-500 transition-all duration-200 group-focus-within:w-full"></div>
</div> `;
export const genTextareaMustache = renderMustache(templateTextareaMustache);
