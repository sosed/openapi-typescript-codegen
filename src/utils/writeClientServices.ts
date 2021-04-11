import { resolve } from 'path';

import type { Service } from '../client/interfaces/Service';
import { HttpClient } from '../HttpClient';
import { writeFile } from './fileSystem';
import { format } from './format';
import { Templates } from './registerHandlebarTemplates';
import { getServiceClassName } from '../openApi/v3/parser/getServiceClassName';

const VERSION_TEMPLATE_STRING = 'OpenAPI.VERSION';

/**
 * Generate Services using the Handlebar template and write to disk.
 * @param services Array of Services to write
 * @param templates The loaded handlebar templates
 * @param outputPath Directory to write the generated files to
 * @param httpClient The selected httpClient (fetch, xhr or node)
 * @param useUnionTypes Use union types instead of enums
 * @param useOptions Use options or arguments functions
 */
export async function writeClientServices(services: Service[], templates: Templates, outputPath: string, httpClient: HttpClient, useUnionTypes: boolean, useOptions: boolean): Promise<void> {
    for (const service of services) {
        const useVersion = service.operations.some(operation => operation.path.includes(VERSION_TEMPLATE_STRING));
        for (const operation of service.operations) {
            const fileName = getServiceFileName(operation.name);
            const file = resolve(outputPath, `${fileName}.ts`);
            const ctx = {
                ...operation,
                serviceName: getServiceClassName(operation.name),
                imports: Array.from(new Set(operation.imports)),
                queryParams: operation.parameters
                    .filter(item => item.in === 'query')
                    .map(item => '\'' + item.name + '\''),
                httpClient,
                useUnionTypes,
                useVersion,
                useOptions,
            };
            const templateResult = templates.exports.service({
                ...ctx,
                meta: JSON.stringify(ctx, null, '  '),
            });
            await writeFile(file, format(templateResult));
        }
    }
}

export function getServiceFileName(value: string): string {
    const name = value
        .replace(/([A-Z])([A-Z])/g, '$1-$2')
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();

    if (name && !name.endsWith('service')) {
        return `${name}.service`;
    }
    return name;
}
