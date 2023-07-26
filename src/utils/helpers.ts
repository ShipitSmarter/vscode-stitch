import { posix as path } from 'path';
import fs = require("fs");
import { IntegrationResult } from "../types/apiTypes";
import glob = require("glob");

export function debounce<Params extends unknown[]>(func: (...args: Params) => unknown, timeout: number): (...args: Params) => void {
    let timer: NodeJS.Timeout;
    return (...args: Params) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func(...args); }, timeout);
    };
}

export async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(() => resolve(undefined), ms);
    });
}

export function unescapeResponseBody(result: IntegrationResult): string {
    // NOTE: body is a json escaped string (eg { \"node\": 123 })
    const unescapedBody = result.body.replace(/\\"/g, "\"");
    return unescapedBody;
}

export function isJson(content: string): boolean{
    const jsonChars = ['{', '['];
    return jsonChars.some(c => content.startsWith(c));
}

export function findDirectoryWithinParent(currentFolder: string, folderNameToLookFor: string, maxUp: number) : string | undefined  {
    const pathCheck = path.join(currentFolder, folderNameToLookFor);
    if (maxUp === 0) { return undefined; }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (fs.existsSync(pathCheck)) { return pathCheck; }
    else {
        return findDirectoryWithinParent(path.dirname(currentFolder), folderNameToLookFor, --maxUp);
    }
}

/**
 * Wrapper around glob.sync that always returns paths delimited with `/`. 
 * @param pattern 
 */
export function globSync(pattern: string) : string[] {
    return glob.sync(pattern, { posix: true});
}