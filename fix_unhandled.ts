import fs from 'fs';

let file1 = fs.readFileSync('src/components/tenant/TenantPublicPage.tsx', 'utf8');
file1 = file1.replace(/getDoc\(doc\(db, 'frontendConfigs', tId\)\)\.then\(\(snap\) => \{/g, 'getDoc(doc(db, \'frontendConfigs\', tId)).then((snap) => {').replace(/setFrontConfig\(snap\.data\(\) as FrontendConfig\);\s*\}\s*\}\)/g, 'setFrontConfig(snap.data() as FrontendConfig);\n        }\n      }).catch((err) => console.warn(\'Error fetching frontend config:\', err));');
fs.writeFileSync('src/components/tenant/TenantPublicPage.tsx', file1);

let file2 = fs.readFileSync('src/components/platform/PlatformLandingPage.tsx', 'utf8');
file2 = file2.replace(/getDoc\(doc\(db, 'frontendConfigs', 'platform'\)\)\.then\(snap => \{/g, 'getDoc(doc(db, \'frontendConfigs\', \'platform\')).then(snap => {').replace(/setFrontConfig\(snap\.data\(\) as FrontendConfig\);\s*\}\s*\}/g, 'setFrontConfig(snap.data() as FrontendConfig);\n      }\n    }).catch((err) => console.warn(\'Error fetching platform config:\', err))');
fs.writeFileSync('src/components/platform/PlatformLandingPage.tsx', file2);

console.log('Fixed unhandled rejections.');
