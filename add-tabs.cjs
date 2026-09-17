const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const importsToAdd = `
import { AttendanceSettingsTab } from './AttendanceSettingsTab';
import { AdmissionsSettingsTab } from './AdmissionsSettingsTab';
import { ReportsSettingsTab } from './ReportsSettingsTab';
import { WhatsAppSettingsTab } from './WhatsAppSettingsTab';
import { SupervisorsManagementTab } from './SupervisorsManagementTab';
`;

code = code.replace(/import \{ AdminOverviewDashboard \} from '\.\/AdminOverviewDashboard';/, importsToAdd + "\nimport { AdminOverviewDashboard } from './AdminOverviewDashboard';");

const tabsToAdd = `
      {activeTab === 'attendance_settings' && <AttendanceSettingsTab />}
      {activeTab === 'admissions_settings' && <AdmissionsSettingsTab />}
      {activeTab === 'reports_settings' && <ReportsSettingsTab />}
      {activeTab === 'whatsapp_settings' && <WhatsAppSettingsTab />}
      {activeTab === 'supervisors' && <SupervisorsManagementTab />}
`;

code = code.replace(/\{activeTab === 'frontend' && <FrontendManagementTab \/>\}/, "{activeTab === 'frontend' && <FrontendManagementTab />}" + tabsToAdd);

fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
