const fs = require('fs');
let code = fs.readFileSync('src/components/admin/WhatsAppSettingsTab.tsx', 'utf8');

// Replace standard imports
code = code.replace(/import \{ WhatsAppApiConfig \} from '\.\.\/\.\.\/types';/, "import { WhatsAppApiConfig } from '../../types';\nimport { useApp } from '../../context/AppContext';");
code = code.replace(/import \{\n  getWhatsAppConfig,\n  saveWhatsAppConfig,\n  testWhatsAppApiConnection,\n\} from '\.\.\/\.\.\/lib\/whatsappCloudApi';/, "import { DEFAULT_WHATSAPP_CONFIG, testWhatsAppApiConnection } from '../../lib/whatsappCloudApi';");

// Replace component beginning
code = code.replace(/export const WhatsAppSettingsTab: React\.FC = \(\) => \{\n  const \[config, setConfig\] = useState<WhatsAppApiConfig>\(getWhatsAppConfig\(\)\);/, `export const WhatsAppSettingsTab: React.FC = () => {
  const { activeTenant, updateWhatsAppConfig } = useApp();
  const [config, setConfig] = useState<WhatsAppApiConfig>(activeTenant?.whatsappConfig || DEFAULT_WHATSAPP_CONFIG);

  React.useEffect(() => {
    if (activeTenant) {
      setConfig(activeTenant.whatsappConfig || DEFAULT_WHATSAPP_CONFIG);
    }
  }, [activeTenant]);`);

// Replace handleSave
code = code.replace(/const handleSave = \(e: React\.FormEvent\) => \{\n    e\.preventDefault\(\);\n    saveWhatsAppConfig\(config\);\n    setSavedToast\(true\);\n    setTimeout\(\(\) => setSavedToast\(false\), 3000\);\n  \};/, `const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateWhatsAppConfig(config);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };`);

fs.writeFileSync('src/components/admin/WhatsAppSettingsTab.tsx', code);
