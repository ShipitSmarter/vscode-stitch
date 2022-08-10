import path = require("path");
import fs = require("fs");
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
 * Find the common parent directory for two paths
 * @param path1 Path to check
 * @param path2 Other path to check against
 * @returns Common parent directory or undefined
 */
export function findCommandParentDirectory(path1: string, path2: string) : string | undefined {
    if (path1 === path2) {
        return path1;
    }
    let posLastDirSeparator = -1;

    for (let i =0; i < path1.length; i++) {
        if (path1[i] !== path2[i]) {
            break;
        }
        if (path1[i] === path.sep) { posLastDirSeparator = i; }
    }
    if (posLastDirSeparator === -1) { return undefined; }

    return path1.substring(0, posLastDirSeparator + 1);
}