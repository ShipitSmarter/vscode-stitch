"use strict";

window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'requestScrollPosition':
            vscode.postMessage({action: 3, content: `${window.scrollY}` }); // 3 = CommandAction.storeScrollPosition
            break;
        case 'setScrollPosition':
            window.scrollTo(0, message.scrollY);
    }
});
