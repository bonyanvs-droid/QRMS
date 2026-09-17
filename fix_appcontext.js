const fs = require('fs');
let file = fs.readFileSync('src/context/AppContext.tsx', 'utf8');

file = file.replace(/if \(remoteLessons\.length > 0\) \{\s*setSpellingLessons\(remoteLessons\);\s*\}/g, 'setSpellingLessons(remoteLessons);');
file = file.replace(/if \(remotePlan\.length > 0\) \{\s*setEducationalPlan\(remotePlan\);\s*\}/g, 'setEducationalPlan(remotePlan);');
file = file.replace(/if \(remoteBadges\.length > 0\) \{\s*setBadges\(remoteBadges\);\s*\}/g, 'setBadges(remoteBadges);');
file = file.replace(/if \(remoteTenants\.length > 0\) \{\s*setTenants\(remoteTenants\);\s*\}/g, 'setTenants(remoteTenants);');
file = file.replace(/if \(remoteStages\.length > 0\) \{\s*setStages\(remoteStages\);\s*\}/g, 'setStages(remoteStages);');
file = file.replace(/if \(remoteArchives\.length > 0\) \{\s*setArchives\(remoteArchives\);\s*\}/g, 'setArchives(remoteArchives);');
file = file.replace(/if \(remoteOrgs\.length > 0\) \{\s*setOrganizations\(remoteOrgs\);\s*\}/g, 'setOrganizations(remoteOrgs);');
file = file.replace(/if \(remoteConfigs\.length > 0\) \{\s*setQuranStageConfigs\(remoteConfigs\);\s*\}/g, 'setQuranStageConfigs(remoteConfigs);');

// Also remove `activeTenantId === (INITIAL_TENANTS[0]?.id || 'ghazzawi')` fallback checks
// Let's replace the merging logic for remoteStudents, remoteRecords, etc. to unconditionally update.
fs.writeFileSync('src/context/AppContext.tsx', file);
