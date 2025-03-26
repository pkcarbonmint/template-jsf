import {stat, readdir, readFile, mkdir} from 'fs/promises';
import path from 'path';
import { camelCase, upperFirst } from 'lodash';
import logger from '../utils/logger';
import { renderMustache } from '../utils/render-mustache';

const metaMustacheTemplate = `
// Generated from template file: {{{templateFile}}}
import Mustache from 'mustache';
const renderMustache = (template: string) => (context:any): string => Mustache.render(template, context);

const template{{{templateName}}} = \`{{{templateCode}}}\`;
export const gen{{{templateName}}} = renderMustache(template{{{templateName}}});
`;
const renderer = renderMustache(metaMustacheTemplate);

type FileName = string;
type MustacheTemplate = string;

const removeSpecials = (templateName: FileName) => templateName.replace(/[\s\/\.]/g, '-');
const removeSuffix = (templateName: FileName) => templateName.replace(/\.js.mustache$|\.ts.mustache$|\.tsx.mustache$/, '');
function codeFriendlyTemplateName(templateName: FileName): string {
    return upperFirst(camelCase(removeSpecials(removeSuffix(templateName))));
}

export async function compileTemplates(templateRootDir: string, outDir: string): Promise<void> {
    const recursiveFileList: FileName[] = await readRecursive(templateRootDir);
    logger.info(`Found ${recursiveFileList.length} templates`);
    try {
        await stat(outDir);
    } catch (err) { 
        if (err instanceof Error && 'code' in err && err.code !== 'ENOENT') {
            throw err;
        }
        logger.debug(`Creating output directory: ${outDir}`);
        await mkdir(outDir, { recursive: true });
    }
    for (const templateName of recursiveFileList) {
        const relativeName = templateName.replace(templateRootDir + "/", "");
        logger.debug(`Processing template: ${relativeName}`);
        const mustacheTemplate: MustacheTemplate = await readFile(templateName, 'utf8');
        const metaCtx = {
            templateFile: relativeName,
            templateName: codeFriendlyTemplateName(relativeName),
            templateCode: mustacheTemplate.replace(/[\`]/g, '\\\`').replace(/[\$]/g, '\\\$')
        };
        const outFile = outDir + "/" + removeSuffix(relativeName) + ".ts";
        await renderer(outFile, metaCtx);
    }
}

async function readRecursive(dir: string): Promise<FileName[]> {
    const files = await readdir(dir);
    const result: string[] = [];
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
            result.push(...await readRecursive(filePath));
        } else {
            if (filePath.endsWith('.mustache')) {
                result.push(filePath);
            }
        }
    }
    return result;
}

// Run the template compiler if this is beinginvoked directly
if (require.main === module) {
    const templateDir = process.argv[2] || 'src/template-generator/templates';
    const outDir = process.argv[3] || 'src/template-generator/compiled-templates';
    if (! (templateDir && outDir)) {
        logger.error("Usage: template-compiler <template-dir> <out-dir>");
        process.exit(1);
    }
    compileTemplates(templateDir, outDir).catch(err => {
        logger.error(err);
        process.exit(1);
    });
}