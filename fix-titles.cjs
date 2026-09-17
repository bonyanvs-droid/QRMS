const fs = require('fs');
let code = fs.readFileSync('src/lib/navigationConfig.ts', 'utf8');

code = code.replace(/overview: 'الرئيسية \/ النظرة العامة',/g, "overview: '🏠 الرئيسية / النظرة العامة',");
code = code.replace(/teachers_halaqahs: 'الحلقات والمعلمون',/g, "teachers_halaqahs: '📚 الحلقات والمعلمون',");
code = code.replace(/students_services: 'الطلاب وشؤون المستفيدين',/g, "students_services: '👨‍🎓 الطلاب وشؤون المستفيدين',");
code = code.replace(/quran_curriculum: 'القرآن والمناهج',/g, "quran_curriculum: '📖 القرآن والمناهج',");
code = code.replace(/educational_programs: 'البرامج التربوية',/g, "educational_programs: '🌱 البرامج التربوية',");
code = code.replace(/reports: 'التقارير والمتابعة',/g, "reports: '📊 التقارير والمتابعة',");
code = code.replace(/public_interface: 'الواجهة العامة',/g, "public_interface: '🌐 الواجهة العامة',");
code = code.replace(/global_settings: 'الإعدادات العامة',/g, "global_settings: '⚙️ الإعدادات العامة',");
code = code.replace(/system_admin: 'إدارة النظام'/g, "system_admin: '🛡️ إدارة النظام'");

fs.writeFileSync('src/lib/navigationConfig.ts', code);
