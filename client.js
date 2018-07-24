/*
 * Copyright (c) 2018. Constantin Galbenu <xprt64@gmail.com> Toate drepturile rezervate. All rights reserved.
 */

const PORT = 6971;
const eventSource = new EventSource(
    '//' + window.location.hostname + ':' + PORT + '/?debug_url=' + encodeURIComponent(window.location) +
    '&debug_time=' + (new Date()).toLocaleTimeString(), {
        withcredentials: false
    });

window.addEventListener('beforeunload', function () {
    eventSource.close();
});

eventSource.addEventListener('change', function (e) {
    console.log(e);
    var data = JSON.parse(e.data);
    reloadFile(data.filename);
}, false);

function reloadFile(filename) {
    const publicFilePath = filename.replace(/\/watch\/(.*)/, '/$1');
    document.querySelectorAll(`[href*="${publicFilePath}"]`).forEach(function (element) {
        const href = element.attributes['href'].value;
        let newHref;

        if (href.match(/_mtime/)) {
            newHref = href.replace(/_mtime=(\d+)/, `_mtime=` + (new Date).getTime());
        }
        else {
            newHref = href + (!href.match(/\?/) ? '?' : '&') + '_mtime=' + (new Date).getTime();
        }
        element.attributes['href'].value = newHref;
    })
}

eventSource.onerror = function (e) {
    console.log(e);
};

