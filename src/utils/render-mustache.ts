import Mustache from "mustache";
import {writeFile as pwriteFile} from 'fs/promises';
type FileName = string;
export type MustacheRenderer = (outFn: FileName, context: any) => Promise<void>;

export const renderMustache = (template: string): MustacheRenderer =>
  async function (outFn: FileName, context: any) {
    const code = Mustache.render(template, context);
    await pwriteFile(outFn, code);
    return;
  };
