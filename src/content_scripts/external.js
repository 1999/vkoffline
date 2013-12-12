var script = document.createElement("script");
script.type = "text/javascript";
script.id = "listen_contest_external";
script.dataset.appId = chrome.runtime.id;

var xhr = new XMLHttpRequest;
xhr.open("GET", chrome.runtime.getURL("/content_scripts/internal.js"), true);
xhr.onload = function () {
    script.innerHTML = xhr.responseText;
    document.body.appendChild(script);
};

xhr.send();
