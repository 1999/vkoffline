var script = document.createElement("script");
script.type = "text/javascript";

var xhr = new XMLHttpRequest;
xhr.open("GET", chrome.runtime.getURL("/content_scripts/internal.js"), true);
xhr.onload = function () {
    script.innerHTML = xhr.responseText;
    document.body.appendChild(script);
};

xhr.send();
