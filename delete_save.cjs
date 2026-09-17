const fs = require('fs');
let code = fs.readFileSync('src/components/common/SmartAttendanceWidget.tsx', 'utf8');

code = code.replace(/const handleSaveSettings = async \([\s\S]*?تحديث إعدادات موقع النطاق ورسالة الحضور بنجاح.' \}\);\n  };\n/g, '');
code = code.replace(/const \[settingsOpen, setSettingsOpen\] = useState\(false\);\n?/g, '');

fs.writeFileSync('src/components/common/SmartAttendanceWidget.tsx', code);
