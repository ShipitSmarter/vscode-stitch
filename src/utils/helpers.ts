import * as path from "path";
import * as fs from "fs";
import { IntegrationResult } from "../types/apiTypes";

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