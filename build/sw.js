/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-aeb6ecaf'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "quran-favicon.svg",
    "revision": "1110d07994af611492abcef2802f573c"
  }, {
    "url": "pwa-512x512.png",
    "revision": "68e7ba3ebdb83a60b58c7c3e2e05feb4"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6ea64ff4e12182082b3522cd6f81c06d"
  }, {
    "url": "mosque-logo.png",
    "revision": "c7a1104c264655cd1d78a5099e796a64"
  }, {
    "url": "mosque-logo.jpeg",
    "revision": "a0cdfbcff7b12a06af907297853bd3f2"
  }, {
    "url": "index.html",
    "revision": "9f2de4112f4bf3001f45dca0ccefdeb0"
  }, {
    "url": "favicon.ico",
    "revision": "8e6ce27415c832a5f5f2d4d742620c8b"
  }, {
    "url": "baraem-logo.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "60c4cea4f3ebe63ea825dfb0bb3dcf2d"
  }, {
    "url": "8349e039-325f-4c91-a534-9d77eed414bc.jpeg",
    "revision": "a0cdfbcff7b12a06af907297853bd3f2"
  }, {
    "url": "76101.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "assets/vendor-xlsx-DraEgqC5.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-Cyw5ihM7.js",
    "revision": null
  }, {
    "url": "assets/vendor-lucide-C4HlnKi_.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-B0qSXXF1.js",
    "revision": null
  }, {
    "url": "assets/vendor-export-DuSizkdj.js",
    "revision": null
  }, {
    "url": "assets/vendor-common-CIGW-MKW.css",
    "revision": null
  }, {
    "url": "assets/vendor-common-BZVb8RZy.js",
    "revision": null
  }, {
    "url": "assets/quran-json-BXqiKKVS.js",
    "revision": null
  }, {
    "url": "assets/index-C46njZYu.js",
    "revision": null
  }, {
    "url": "assets/index-BhYUmsRG.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "60c4cea4f3ebe63ea825dfb0bb3dcf2d"
  }, {
    "url": "favicon.ico",
    "revision": "8e6ce27415c832a5f5f2d4d742620c8b"
  }, {
    "url": "mosque-logo.jpeg",
    "revision": "a0cdfbcff7b12a06af907297853bd3f2"
  }, {
    "url": "mosque-logo.png",
    "revision": "c7a1104c264655cd1d78a5099e796a64"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6ea64ff4e12182082b3522cd6f81c06d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "68e7ba3ebdb83a60b58c7c3e2e05feb4"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4b99c6e90d360ae4d54582c9c3b8b036"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//, /^\/manifest\.webmanifest/, /^\/uploads\//]
  }));
  workbox.registerRoute(/\/api\/.*/i, new workbox.NetworkOnly(), 'GET');

}));
