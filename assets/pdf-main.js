"use strict";

window.addEventListener('message', event => {
    const message = event.data;

    switch (message.command) {
        case 'loadData':
            window.PDFViewerApplication.open(`data:application/pdf;base64,${message.data}`);
            break;
    }
});

window.onerror = function (e) {
    const msg = document.createElement('body');
    msg.classList.add('error');
    msg.innerHTML = `
    <p>An error occurred while loading the file. Please open it again.</p>
    <br>
    <p>${e}</p>`;
    document.body = msg;
};
