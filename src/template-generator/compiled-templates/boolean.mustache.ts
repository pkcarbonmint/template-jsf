
// Generated from template file: boolean.mustache
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const templateBooleanMustache = `<label class="inline-flex items-center cursor-pointer">
  <div class="relative">
    <input 
      type="checkbox"
      id="{{id}}"
      name="{{id}}"
      class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      data-schema-type="boolean"
      data-schema-id="{{id}}"
      data-schema-path="{{id}}"
      {{#required}}required{{/required}}
      {{#default}}{{#default}}checked{{/default}}{{/default}}
    />
    <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500">
    </div>
  </div>
  <span class="ml-3 text-sm font-medium text-gray-700">{{#default}}{{#default}}Enabled{{/default}}{{/default}}{{^default}}{{^default}}Disabled{{/default}}{{/default}}</span>
</label> `;
export const genBooleanMustache = renderMustache(templateBooleanMustache);
