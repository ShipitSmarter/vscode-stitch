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
