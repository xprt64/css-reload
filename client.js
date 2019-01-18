/*
 * Copyright (c) 2018. Constantin Galbenu <xprt64@gmail.com> Toate drepturile rezervate. All rights reserved.
 */

function getPort() {
    return window.location.protocol === 'http:' ? __PORT__ : __SECURE_PORT__;
}


const eventSource = new EventSource(
    `//__HOST__:${getPort()}/?debug_url=` + encodeURIComponent(window.location) +
    '&debug_time=' + (new Date()).toLocaleTimeString(), {
        withcredentials: false
    });

window.addEventListener('beforeunload', function () {
    eventSource.close();
});

eventSource.addEventListener('change', function (e) {
    console.log(e);
    setTimeout(() => {
        var data = JSON.parse(e.data);
        reloadFile(data.filename);
    }, 500);
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
        element.onerror = function(){ reloadFile(filename);};
        element.attributes['href'].value = newHref;
      })
}

eventSource.onerror = function (e) {
    console.log(e);
};

