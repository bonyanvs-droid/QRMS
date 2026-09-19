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
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

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
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "mosque-logo.jpeg",
    "revision": "a0cdfbcff7b12a06af907297853bd3f2"
  }, {
    "url": "index.html",
    "revision": "490cdea98b3b6bc517ad8177e9e4d259"
  }, {
    "url": "baraem-logo.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4bf6076164ca208370920aac94f60872"
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
    "url": "assets/vendor-lucide-3hae711t.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-DMD9BDTk.js",
    "revision": null
  }, {
    "url": "assets/vendor-export-Dfb2eZ1p.js",
    "revision": null
  }, {
    "url": "assets/vendor-common-C1kVHX9k.js",
    "revision": null
  }, {
    "url": "assets/index-DDrAqQrg.css",
    "revision": null
  }, {
    "url": "assets/index-B0xlBSr3.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "baraem-logo.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "mosque-logo.jpeg",
    "revision": "a0cdfbcff7b12a06af907297853bd3f2"
  }, {
    "url": "pwa-192x192.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4bf6076164ca208370920aac94f60872"
  }, {
    "url": "manifest.webmanifest",
    "revision": "1807dd2e4bbea785ee14fa2264941031"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
