-- ============================================================================
-- SQL Migration: Populate Hebrew & Arabic catalog translations
-- Updates ALL 16 careers and 28 activities rows with localized text for Hebrew (he) and Arabic (ar).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Careers Translations
-- ----------------------------------------------------------------------------

-- 1. Software Engineer
UPDATE public.careers SET
  title_he = 'מהנדס תוכנה',
  title_ar = 'مهندس برمجيات',
  description_he = 'מהנדסי תוכנה מתכננים, מפתחים ومتחזקים תוכנות ואפליקציות המשמשות עסקים ופרטים.',
  description_ar = 'يقوم مهندسو البرمجيات بتصميم وتطوير وصيانة برامج الكمبيوتر والتطبيقات التي يستخدمها الأفراد والشركات.',
  required_education_he = ARRAY['תואר ראשון במדעי המחשב או הנדסת תוכנה', 'קורסי תכנות / בוטקאמפ', 'למידה מתמדת של טכנולוגיות חדשות'],
  required_education_ar = ARRAY['بكالوريوس في علوم الحاسوب أو هندسة البرمجيات', 'دورات برمجة مكثفة', 'التعلم المستمر للتقنيات الجديدة'],
  required_skills_he = ARRAY['תכנות (JavaScript, Python, Java)', 'פתרון בעיות', 'חשיבה לוגית', 'עבודת צוות'],
  required_skills_ar = ARRAY['البرمجة (JavaScript, Python, Java)', 'حل المشكلات', 'التفكير المنطقي', 'العمل الجماعي'],
  recommended_subjects_he = ARRAY['מתמטיקה', 'מדעי המחשב', 'פיזיקה'],
  recommended_subjects_ar = ARRAY['الرياضيات', 'علوم الحاسوب', 'الفيزياء'],
  work_environment_he = 'חברות הייטק, סטארטאפים או עבודה מרחוק',
  work_environment_ar = 'شركات التكنولوجيا، الشركات الناشئة، أو العمل عن بعد'
WHERE id = '1';

-- 1-frontend
UPDATE public.careers SET
  title_he = 'מפתח פרונטאנד (Frontend)',
  title_ar = 'مطور واجهات الأمامية (Frontend)',
  description_he = 'מפתחי פרונטאנד מעצבים, בונים ומתחזקים את הרכיבים הוויזואליים וממשק המשתמש של אתרים ואפליקציות.',
  description_ar = 'يقوم مطورو الواجهات الأمامية بتصميم وبرمجة وصيانة العناصر البصرية وواجهة المستخدم للمواقع والتطبيقات.',
  required_education_he = ARRAY['בוטקאמפ לפיתוח אתרים', 'תיק עבודות למידה עצמית', 'למידה רציפה של פרימוורקים'],
  required_education_ar = ARRAY['معسكر تدريبي لبرمجة الويب', 'معرض أعمال ذاتي التعلم', 'التعلم المستمر لأطر العمل'],
  required_skills_he = ARRAY['React / React Native', 'HTML & CSS', 'JavaScript & TypeScript', 'עיצוב רספונסיבי'],
  required_skills_ar = ARRAY['React / React Native', 'HTML & CSS', 'JavaScript & TypeScript', 'التصميم المتجاوب'],
  recommended_subjects_he = ARRAY['מדעי המחשב', 'אמנות', 'מתמטיקה'],
  recommended_subjects_ar = ARRAY['علوم الحاسوب', 'الفنون', 'الرياضيات'],
  work_environment_he = 'חברות טכנולוגיה, סוכנויות דיגיטל או עבודה מרחוק',
  work_environment_ar = 'شركات التكنولوجيا، وكالات الويب، أو العمل عن بعد'
WHERE id = '1-frontend';

-- 1-backend
UPDATE public.careers SET
  title_he = 'מהנדס באקאנד (Backend)',
  title_ar = 'مهندس الخوادم والقواعد (Backend)',
  description_he = 'מהנדסי באקאנד מתמקדים בבנייה ותחזוקה של בסיסי נתונים, APIs, ארכיטקטורת שרתים ולוגיקה עסקית.',
  description_ar = 'يركز مهندسو الخلفية على بناء وصيانة قواعد البيانات، واجهات برمجة التطبيقات (APIs)، وبنية الخوادم.',
  required_education_he = ARRAY['תואר במדעי המחשב', 'בוטקאמפ באקאנד', 'הסמכות בסיסי נתונים'],
  required_education_ar = ARRAY['بكالوريوس علوم الحاسوب', 'دورات الخوادم المكثفة', 'شهادات قواعد البيانات'],
  required_skills_he = ARRAY['Node.js / Python / Go', 'PostgreSQL & SQL', 'תכנון APIs', 'Docker & ענן'],
  required_skills_ar = ARRAY['Node.js / Python / Go', 'PostgreSQL & SQL', 'تصميم APIs', 'Docker والخدمات السحابية'],
  recommended_subjects_he = ARRAY['מדעי המחשב', 'מתמטיקה', 'פיזיקה'],
  recommended_subjects_ar = ARRAY['علوم الحاسوب', 'الرياضيات', 'الفيزياء'],
  work_environment_he = 'משרדי הייטק או צוותים גלובליים',
  work_environment_ar = 'مكاتب التكنولوجيا أو فرق الهندسة عن بعد'
WHERE id = '1-backend';

-- 1-data
UPDATE public.careers SET
  title_he = 'מהנדס נתונים (Data Engineer)',
  title_ar = 'مهندس بيانات (Data Engineer)',
  description_he = 'מהנדסי נתונים מתכננים וממטבים מערכות לאיסוף, אחסון ועיבוד נתונים בהיקף נרחב.',
  description_ar = 'يقوم مهندسو البيانات بتصميم وبناء وتطوير أنظمة جمع وتخزين ومعالجة البيانات ضخمة الحجم.',
  required_education_he = ARRAY['תואר ראשון במדעי הנתונים, מדעי המחשב או מתמטיקה'],
  required_education_ar = ARRAY['بكالوريوس في علم البيانات، علوم الحاسوب، أو الرياضيات'],
  required_skills_he = ARRAY['צינורות נתונים (ETL)', 'SQL & BigData', 'Python / Scala', 'מחסני נתונים'],
  required_skills_ar = ARRAY['خطوط البيانات (ETL)', 'SQL والبيانات الضخمة', 'Python / Scala', 'مستودعات البيانات'],
  recommended_subjects_he = ARRAY['מדעי המחשב', 'מתמטיקה', 'סטטיסטיקה'],
  recommended_subjects_ar = ARRAY['علوم الحاسوب', 'الرياضيات', 'الإحصاء'],
  work_environment_he = 'צוותי טכנולוגיה ארגוניים, מחלקות אנליטיקה',
  work_environment_ar = 'فرق التكنولوجيا المؤسسية، أقسام تحليل البيانات'
WHERE id = '1-data';

-- 2. Doctor
UPDATE public.careers SET
  title_he = 'רופא / רופאה',
  title_ar = 'طبيب / طبيبة',
  description_he = 'רופאים מאבחנים ומטפלים במחלות, מעניקים ייעוץ רפואי ושומרים על בריאות המטופלים.',
  description_ar = 'يقوم الأطباء بتشخيص الأمراض وعلاجها، وتقديم الاستشارات الطبية، والحفاظ على صحة المرضى.',
  required_education_he = ARRAY['תואר פרה-רפואי', 'בית ספר לרפואה (MD)', 'סטאז להתמחות בבית חולים'],
  required_education_ar = ARRAY['درجة ما قبل الطب', 'كلية الطب (MD)', 'التدريب الإقامي في المستشفى'],
  required_skills_he = ARRAY['ידע ביולוגי', 'תקשורת עם מטופלים', 'שימת לב לפרטים', 'חשיבה ביקורתית'],
  required_skills_ar = ARRAY['المعرفة البيولوجية', 'التواصل مع المرضى', 'الاهتمام بالتفاصيل', 'التفكير النقدي'],
  recommended_subjects_he = ARRAY['ביולוגיה', 'כימיה', 'מתמטיקה'],
  recommended_subjects_ar = ARRAY['الأحياء', 'الكيمياء', 'الرياضيات'],
  work_environment_he = 'בתי חולים, מרפאות, מרכזים רפואיים',
  work_environment_ar = 'المستشفيات، العيادات، المراكز الصحية'
WHERE id = '2';

-- 3. Architect
UPDATE public.careers SET
  title_he = 'אדריכל / אדריכלית',
  title_ar = 'مهندس معماري',
  description_he = 'אדריכלים מתכננים ומעצבים מבנים ומתחמים בטיחותיים, פונקציונליים ואסתטיים.',
  description_ar = 'يقوم المهندسون المعماريون بتصميم المباني والتخطيط للمنشآت لتكون آمنة وعملية وجميلة.',
  required_education_he = ARRAY['תואר ראשון באדריכלות', 'סטאז באדריכלות', 'רשיון אדריכל מורשה'],
  required_education_ar = ARRAY['بكالوريوس في الهندسة المعمارية', 'تدريب معماري', 'ترخيص مزاولة المهنة'],
  required_skills_he = ARRAY['יצירתיות', 'חשיבה עיצובית', 'מתמטיקה', 'הדמיה בתלת-ממד'],
  required_skills_ar = ARRAY['الابتكار والابداع', 'التفكير التصميمي', 'الرياضيات', 'التصور ثلاثي الأبعاد'],
  recommended_subjects_he = ARRAY['אמנות', 'מתמטיקה', 'פיזיקה'],
  recommended_subjects_ar = ARRAY['الفنون', 'الرياضيات', 'الفيزياء'],
  work_environment_he = 'משרדי אדריכלות, חברות בנייה',
  work_environment_ar = 'مكاتب الهندسة المعمارية، شركات البناء'
WHERE id = '3';

-- 4. Lawyer
UPDATE public.careers SET
  title_he = 'עורך / עורכת דין',
  title_ar = 'محامي / محامية',
  description_he = 'עורכי דין מייעצים ללקוחות, מייצגים אותם בבית המשפט ומפרשים חוקים ותקנות.',
  description_ar = 'يقدم المحامون المشورة للعملاء، ويمثلونهم في المحاكم، ويفسرون القوانين واللوائح.',
  required_education_he = ARRAY['תואר ראשון במשפטים (LL.B)', 'התמחות במשפטים', 'מעבר בחינות לשכת עורכי הדין'],
  required_education_ar = ARRAY['بكالوريوس في القانون (LL.B)', 'التدريب القانوني', 'شهادة اختبار نقابة المحامين'],
  required_skills_he = ARRAY['טיעון ושכנוע', 'כישורי מחקר', 'תקשורת', 'חשיבה ביקורתית'],
  required_skills_ar = ARRAY['القدرة على المحاججة', 'مهارات البحث', 'التواصل', 'التفكير النقدي'],
  recommended_subjects_he = ARRAY['היסטוריה', 'אזרחות', 'ספרות'],
  recommended_subjects_ar = ARRAY['التاريخ', 'المدنيات', 'الأدب'],
  work_environment_he = 'משרדי עורכי דין, מוסדות ממשלתיים',
  work_environment_ar = 'مكاتب المحاماة، المؤسسات الحكومية'
WHERE id = '4';

-- 5. Mechanical Engineer
UPDATE public.careers SET
  title_he = 'מהנדס מכונות',
  title_ar = 'مهندس ميكانيكي',
  description_he = 'מהנדסי מכונות מתכננים ומפתחים מנועים, מכונות ומערכות מכניות מתקדמות לתעשייה ולאנרגיה.',
  description_ar = 'يقوم المهندسون الميكانيكيون بتصميم وبناء الآلات والأنظمة الميكانيكية المستخدمة في التصنيع والنقل والطاقة.',
  required_education_he = ARRAY['תואר ראשון בהנדסת מכונות', 'סטאז בהנדסה'],
  required_education_ar = ARRAY['بكالوريوس في الهندسة الميكانيكية', 'تدريب هندسي'],
  required_skills_he = ARRAY['מתמטיקה', 'פיזיקה', 'תוכנות CAD', 'פתרון בעיות'],
  required_skills_ar = ARRAY['الرياضيات', 'الفيزياء', 'برامج CAD', 'حل المشكلات'],
  recommended_subjects_he = ARRAY['מתמטיקה', 'פיזיקה', 'מדעי המחשב'],
  recommended_subjects_ar = ARRAY['الرياضيات', 'الفيزياء', 'علوم الحاسوب'],
  work_environment_he = 'חברות הנדסה, מפעלים ומרכזי פיתוח',
  work_environment_ar = 'شركات الهندسة، شركات التصنيع'
WHERE id = '5';

-- 6. Data Scientist
UPDATE public.careers SET
  title_he = 'מדען נתונים (Data Scientist)',
  title_ar = 'عالم بيانات (Data Scientist)',
  description_he = 'מדעני נתונים מנתחים מאגרי מידע ענקיים למציאת תבניות ועזרה לקבלת החלטות מבוססות נתונים.',
  description_ar = 'يقوم علماء البيانات بتحليل مجموعات البيانات الضخمة لاكتشاف الأنماط ومساعدة المؤسسات على اتخاذ قرارات مبنية على البيانات.',
  required_education_he = ARRAY['תואר במדעי הנתונים, סטטיסטיקה, מדעי המחשב או מתמטיקה'],
  required_education_ar = ARRAY['بكالوريوس في علم البيانات، الإحصاء، علوم الحاسوب، أو الرياضيات'],
  required_skills_he = ARRAY['Python או R', 'סטטיסטיקה', 'למידת מכונה (Machine Learning)', 'ויזואליזציית נתונים'],
  required_skills_ar = ARRAY['Python أو R', 'الإحصاء', 'تعلم الآلة', 'تصوير البيانات'],
  recommended_subjects_he = ARRAY['מתמטיקה', 'מדעי המחשב', 'סטטיסטיקה'],
  recommended_subjects_ar = ARRAY['الرياضيات', 'علوم الحاسوب', 'الإحصاء'],
  work_environment_he = 'חברות טכנולוגיה, מעבדות מחקר',
  work_environment_ar = 'شركات التكنولوجيا، مختبرات الأبحاث'
WHERE id = '6';

-- 7. Civil Engineer
UPDATE public.careers SET
  title_he = 'מהנדס אזרחי',
  title_ar = 'مهندس مدني',
  description_he = 'מהנדסים אזרחיים מתכננים ומפקחים על פרויקטי תשתית כגון כבישים, גשרים ומבנים.',
  description_ar = 'يقوم المهندسون المدنيون بتصميم والإشراف على مشاريع البنية التحتية مثل الطرق والجسور والمباني.',
  required_education_he = ARRAY['תואר ראשון בהנדסה אזרחית', 'סטאז בהנדסה'],
  required_education_ar = ARRAY['بكالوريوس في الهندسة المدنية', 'تدريب هندسي'],
  required_skills_he = ARRAY['ניתוח מבנים', 'מתמטיקה', 'תכנון פרויקטים'],
  required_skills_ar = ARRAY['التحليل الإنشائي', 'الرياضيات', 'تخطيط المشاريع'],
  recommended_subjects_he = ARRAY['מתמטיקה', 'פיזיקה'],
  recommended_subjects_ar = ARRAY['الرياضيات', 'الفيزياء'],
  work_environment_he = 'חברות בנייה, פרויקטי תשתית ממשלתיים',
  work_environment_ar = 'شركات البناء، مشاريع البنية التحتية الحكومية'
WHERE id = '7';

-- 8. Graphic Designer
UPDATE public.careers SET
  title_he = 'מעצב / מעצבת גרפית',
  title_ar = 'مصمم جرافيك',
  description_he = 'מעצבים גרפיים יוצרים חומרים וויזואליים כגון לוגואים, פרסומות, ומדיה דיגיטלית.',
  description_ar = 'يقوم مصممو الجرافيك بإنشاء المواد البصرية مثل الشعارات، الإعلانات، والوسائط الرقمية.',
  required_education_he = ARRAY['תואר או תעודה בתקשורת חזותית / עיצוב גרפי'],
  required_education_ar = ARRAY['درجة في التصميم الجرافيكي أو الاتصال البصري'],
  required_skills_he = ARRAY['Adobe Creative Suite', 'טיפוגרפיה', 'חשיבה ויזואלית', 'עיצוב מותג'],
  required_skills_ar = ARRAY['برامج أدوبي الإبداعية', 'الخطوط والطباعة', 'التفكير البصري', 'تصميم الهوية التجارية'],
  recommended_subjects_he = ARRAY['אמנות', 'עיצוב', 'תקשורת'],
  recommended_subjects_ar = ARRAY['الفنون', 'التصميم', 'الإعلام'],
  work_environment_he = 'סטודיו לעיצוב, סוכנויות פרסום, עצמאי/ת',
  work_environment_ar = 'استوديوهات التصميم، وكالات الإعلانات، العمل الحر'
WHERE id = '8';

-- 8-animator
UPDATE public.careers SET
  title_he = 'אנימטור / אנימטורית מתיז (Motion Graphics)',
  title_ar = 'مصمم رسوم متحركة (Motion Graphics)',
  description_he = 'אנימטורים יוצרים וידאו בתנועה, אפקטים ויזואליים ואלמנטים דינמיים למשחקים ולמדיה.',
  description_ar = 'يقوم مصممو الرسوم المتحركة بإنشاء مؤثرات بصرية ورسوم ديناميكية للفيديوهات والألعاب والويب.',
  required_education_he = ARRAY['תואר באנימציה או תקשורת חזותית', 'קורס מתקדם ב-Motion Design'],
  required_education_ar = ARRAY['شهادة في الرسوم المتحركة أو الاتصال البصري', 'دورة متخصصة في موشن جرافيك'],
  required_skills_he = ARRAY['Adobe After Effects', 'מידול תלת-ממד (Blender/Cinema4D)', 'סיפור סיפורים ויזואלי'],
  required_skills_ar = ARRAY['Adobe After Effects', 'النمذجة ثلاثية الأبعاد (Blender)', 'السرد البصري'],
  recommended_subjects_he = ARRAY['אמנות', 'עיצוב', 'תקשורת'],
  recommended_subjects_ar = ARRAY['الفنون', 'التصميم', 'الإعلام'],
  work_environment_he = 'סטודיו לאנימציה, חברות מדיה, עצמאי/ת',
  work_environment_ar = 'استوديوهات الرسوم المتحركة، وكالات الإبداع، العمل الحر'
WHERE id = '8-animator';

-- 8-brand
UPDATE public.careers SET
  title_he = 'מעצב מותג ומערכות זהות ויזואלית',
  title_ar = 'مصمم الهوية التجارية والشعارات',
  description_he = 'מעצבי מותג מתמחים ביצירת שפות מותג, ספרי מותג, לוגואים וטיפוגרפיה עבור חברות.',
  description_ar = 'يتخصص مصممو العلامات التجارية في إنشاء أنظمة الهوية البصرية والشعارات والتصاميم المؤسسية.',
  required_education_he = ARRAY['תואר בתקשורת חזותית או עיצוב גרפי'],
  required_education_ar = ARRAY['شهادة في الاتصال البصري أو التصميم الجرافيكي'],
  required_skills_he = ARRAY['Adobe Illustrator / Photoshop', 'טיפוגרפיה', 'עיצוב לוגו', 'שפת מותג'],
  required_skills_ar = ARRAY['Adobe Illustrator / Photoshop', 'فن الخطوط', 'تصميم الشعارات', 'دليل العلامة التجارية'],
  recommended_subjects_he = ARRAY['אמנות', 'עיצוב', 'מדיה'],
  recommended_subjects_ar = ARRAY['الفنون', 'التصميم', 'الإعلام'],
  work_environment_he = 'משרדי עיצוב, משרדי פרסום, פרילנס',
  work_environment_ar = 'مكاتب التصميم، وكالات الإعلان، العمل الحر'
WHERE id = '8-brand';

-- 9. Psychologist
UPDATE public.careers SET
  title_he = 'פסיכולוג / פסיכולוגית',
  title_ar = 'أخصائي نفسي',
  description_he = 'פסיכולוגים חוקרים את התנהגות האדם ועוזרים לאנשים להתמודד עם אתגרים רגשיים ונפשיים.',
  description_ar = 'يدرس الأخصائيون النفسيون السلوك البشري ويساعدون الأفراد على التعامل مع التحديات العاطفية والنفسية.',
  required_education_he = ARRAY['תואר ראשון בפסיכולוגיה', 'תואר שני / דוקטורט בפסיכולוגיה'],
  required_education_ar = ARRAY['بكالوريوس في علم النفس', 'ماجستير أو دكتوراه في علم النفس'],
  required_skills_he = ARRAY['אמפתיה', 'תקשורת בינאישית', 'כישורי מחקר', 'חשיבה אנליטית'],
  required_skills_ar = ARRAY['التعاطف', 'التواصل', 'مهارات البحث', 'التفكير التحليلي'],
  recommended_subjects_he = ARRAY['ביולוגיה', 'פסיכולוגיה', 'מדעי החברה'],
  recommended_subjects_ar = ARRAY['الأحياء', 'علم النفس', 'الدراسات الاجتماعية'],
  work_environment_he = 'בתי חולים, מרפאות, בתי ספר, קליניקה פרטית',
  work_environment_ar = 'المستشفيات، العيادات، المدارس، العيادات الخاصة'
WHERE id = '9';

-- 10. Cybersecurity Analyst
UPDATE public.careers SET
  title_he = 'אנליסט סייבר / מומחה אבטחת מידע',
  title_ar = 'محلل أمن سيبراني',
  description_he = 'אנליסטים של סייבר מגינים על רשתות מחשבים ומערכות מפני פריצות ואיומי אבטחה.',
  description_ar = 'يحمي محللو الأمن السيبراني شبكات الكمبيوتر والأنظمة من الاختراق والتهديدات السيبرانية.',
  required_education_he = ARRAY['תואר ראשון בסייבר או מדעי המחשב', 'הסמכות אבטחת מידע'],
  required_education_ar = ARRAY['بكالوريوس في الأمن السيبراني أو علوم الحاسوب', 'شهادات الأمان'],
  required_skills_he = ARRAY['אבטחת רשתות', 'האקינג אתי', 'ניתוח סיכונים'],
  required_skills_ar = ARRAY['أمن الشبكات', 'القرصنة الأخلاقية', 'تحليل المخاطر'],
  recommended_subjects_he = ARRAY['מדעי המחשב', 'מתמטיקה', 'טכנולוגיית מידע'],
  recommended_subjects_ar = ARRAY['علوم الحاسوب', 'الرياضيات', 'تكنولوجيا المعلومات'],
  work_environment_he = 'חברות הייטק, בנקים, גופים ביטחוניים וממשלתיים',
  work_environment_ar = 'شركات التكنولوجيا، البنوك، الهيئات الحكومية'
WHERE id = '10';

-- 11. Teacher
UPDATE public.careers SET
  title_he = 'מורה / מחנך',
  title_ar = 'معلم / معلمة',
  description_he = 'מורים ומחנכים מלמדים תלמידים ועוזרים להם לפתח ידע אקדמי ומיומנויות חשיבה ביקורתית.',
  description_ar = 'يقوم المعلمون بتعليم الطلاب ومساعدتهم على تطوير المعرفة الأكاديمية ومهارات التفكير النقدي.',
  required_education_he = ARRAY['תואר ראשון בחינוך', 'תעודת הוראה'],
  required_education_ar = ARRAY['بكالوريوس في التربية', 'شهادة التدريس'],
  required_skills_he = ARRAY['תקשורת והדרכה', 'סבלנות', 'שיטות הוראה מתקדמות'],
  required_skills_ar = ARRAY['التواصل', 'الصبر', 'أساليب التدريس'],
  recommended_subjects_he = ARRAY['ספרות', 'מתמטיקה', 'מדעי החברה'],
  recommended_subjects_ar = ARRAY['الأدب', 'الرياضيات', 'الدراسات الاجتماعية'],
  work_environment_he = 'בתי ספר ומוסדות חינוך',
  work_environment_ar = 'المدارس والمؤسسات التعليمية'
WHERE id = '11';

-- 12. Environmental Scientist
UPDATE public.careers SET
  title_he = 'מדען איכות הסביבה',
  title_ar = 'عالم بيئة',
  description_he = 'מדעני סביבה חוקרים בעיות סביבתיות ועוזרים לפתח פתרונות לזיהום ושינויי אקלים.',
  description_ar = 'يبحث علماء البيئة في المشكلات البيئية ويساعدون في تطوير حلول للتلوث وتغير المناخ.',
  required_education_he = ARRAY['תואר במדעי הסביבה'],
  required_education_ar = ARRAY['بكالوريوس في علوم البيئة'],
  required_skills_he = ARRAY['מחקר מדעי', 'ניתוח נתונים', 'הבנת מדיניות סביבתית'],
  required_skills_ar = ARRAY['البحث العلمي', 'تحليل البيانات', 'فهم السياسات البيئية'],
  recommended_subjects_he = ARRAY['ביולוגיה', 'כימיה', 'גיאוגרפיה'],
  recommended_subjects_ar = ARRAY['الأحياء', 'الكيمياء', 'الجغرافيا'],
  work_environment_he = 'מכוני מחקר, ארגוני איכות הסביבה',
  work_environment_ar = 'معاهد الأبحاث، المنظمات البيئية'
WHERE id = '12';

-- 13. Business Analyst
UPDATE public.careers SET
  title_he = 'אנליסט עסקי',
  title_ar = 'محلل أعمال',
  description_he = 'אנליסטים עסקיים עוזרים לארגונים לפרק ולשפר ביצועים על ידי ניתוח נתונים ותהליכים עסקיים.',
  description_ar = 'يساعد محللو الأعمال المؤسسات على تحسين الأداء من خلال تحليل البيانات والعمليات التجارية.',
  required_education_he = ARRAY['תואר ראשון במנהל עסקים או כלכלה'],
  required_education_ar = ARRAY['بكالوريوس في إدارة الأعمال أو الاقتصاد'],
  required_skills_he = ARRAY['ניתוח נתונים', 'אסטרטגיה עסקית', 'פתרון בעיות'],
  required_skills_ar = ARRAY['تحليل البيانات', 'استراتيجية الأعمال', 'حل المشكلات'],
  recommended_subjects_he = ARRAY['מתמטיקה', 'כלכלה', 'מינהל עסקים'],
  recommended_subjects_ar = ARRAY['الرياضيات', 'الاقتصاد', 'دراسات الأعمال'],
  work_environment_he = 'תאגידים, חברות ייעוץ',
  work_environment_ar = 'الشركات المؤسسية، شركات الاستشارات'
WHERE id = '13';

-- 14. Journalist
UPDATE public.careers SET
  title_he = 'עיתונאי / כתב',
  title_ar = 'صحفي / إعلامي',
  description_he = 'עיתונאים חוקרים ומדווחים על חדשות וסיפורים בערוצי טלוויזיה, עיתונים ומדיה דיגיטלית.',
  description_ar = 'يقوم الصحفيون بالبحث وإعداد التقارير الإخبارية عبر التلفزيون والصحف والوسائط الرقمية.',
  required_education_he = ARRAY['תואר בתקשורת או עיתונאות'],
  required_education_ar = ARRAY['درجة في الصحافة أو الإعلام'],
  required_skills_he = ARRAY['כתיבה עיתונאית', 'כישורי מחקר ותחקיר', 'תקשורת בינאישית'],
  required_skills_ar = ARRAY['الكتابة', 'البحث', 'التواصل'],
  recommended_subjects_he = ARRAY['ספרות', 'היסטוריה', 'תקשורת ומדיה'],
  recommended_subjects_ar = ARRAY['الأدب', 'التاريخ', 'دراسات الإعلام'],
  work_environment_he = 'גופי תקשורת, מערכות עיתונים ומדיה',
  work_environment_ar = 'المؤسسات الإخبارية وشركات الإعلام'
WHERE id = '14';

-- 15. Pharmacist
UPDATE public.careers SET
  title_he = 'רוקח / רוקחת',
  title_ar = 'صيدلي / صيدلانية',
  description_he = 'רוקחים מכינים ומנפקים תרופות ומעניקים ייעוץ למטופלים על שימוש בטוח בתרופות.',
  description_ar = 'يقوم الصيدلي بإعداد وصرف الأدوية وتقديم المشورة للمرضى حول الاستخدام الآمن للدارو.',
  required_education_he = ARRAY['תואר ברוקחות (PharmD)', 'רישיון לעסוק ברוקחות'],
  required_education_ar = ARRAY['دكتور صيدلة (PharmD)', 'ترخيص ممارسة الصيدلة'],
  required_skills_he = ARRAY['ידע בכימיה', 'שימת לב לפרטים', 'תקשורת עם מטופלים'],
  required_skills_ar = ARRAY['معرفة الكيمياء', 'الاهتمام بالتفاصيل', 'التواصل'],
  recommended_subjects_he = ARRAY['כימיה', 'ביולוגיה', 'מתמטיקה'],
  recommended_subjects_ar = ARRAY['الكيمياء', 'الأحياء', 'الرياضيات'],
  work_environment_he = 'בתי מרקחת, בתי חולים, חברות תרופות',
  work_environment_ar = 'المستشفيات، الصيدليات، شركات الأدوية'
WHERE id = '15';

-- 16. UX/UI Designer
UPDATE public.careers SET
  title_he = 'מעצב UX/UI',
  title_ar = 'مصمم تجربة وواجهة المستخدم UX/UI',
  description_he = 'מעצבי UX/UI יוצרים ממשקים נוחים, נגישים ומרהיבים לאפליקציות ולאתרים.',
  description_ar = 'يقوم مصممو UX/UI بإنشاء واجهات سهلة الاستخدام وجذابة بصرياً للتطبيقات والمواقع الإلكترونية.',
  required_education_he = ARRAY['תואר בתקשורת חזותית, עיצוב או אינטראקציה'],
  required_education_ar = ARRAY['درجة في التصميم أو التفاعل بين الإنسان والحاسوب'],
  required_skills_he = ARRAY['מחקר משתמשים', 'אפיון (Wireframing)', 'כלי עיצוב (Figma)'],
  required_skills_ar = ARRAY['أبحاث المستخدم', 'تخطيط الواجهات', 'أدوات التصميم (Figma)'],
  recommended_subjects_he = ARRAY['אמנות', 'מדעי המחשב', 'עיצוב'],
  recommended_subjects_ar = ARRAY['الفنون', 'علوم الحاسوب', 'التصميم'],
  work_environment_he = 'חברות הייטק, סטארטאפים, פרילנס',
  work_environment_ar = 'شركات التكنولوجيا، الشركات الناشئة، العمل الحر'
WHERE id = '16';


-- ----------------------------------------------------------------------------
-- Activities Translations
-- ----------------------------------------------------------------------------

UPDATE public.activities SET
  title_he = 'סדנת תכנות ופיתוח אפליקציות נוער',
  title_ar = 'ورشة عمل برمجة وتطوير التطبيقات للشباب',
  description_he = 'סדנה מעשית לנוער הלומדת יסודות תכנות, פיתוח אפליקציות ועבודת צוות בצוותי הייטק.',
  description_ar = 'ورشة عمل عملية للشباب لتعلم أساسيات البرمجة وتطوير التطبيقات والعمل الجماعي.',
  category_he = 'טכנולוגיה',
  category_ar = 'تكنولوجيا',
  location_he = 'תל אביב / אונליין',
  location_ar = 'تل أبيب / عبر الإنترنت'
WHERE id = '1';

UPDATE public.activities SET
  title_he = 'קורס יסודות העיצוב והתקשורת החזותית',
  title_ar = 'دورة أساسيات التصميم والاتصال البصري',
  description_he = 'קורס חוויתי המקנה כלים בבניית קומפוזיציה, טיפוגרפיה, עיצוב גרפי דיגיטלי ותוכנות עיצוב.',
  description_ar = 'دورة تدريبية توفر أدوات في بناء التكوين البصري والخطوط والتصميم الجرافيكي الرقمي.',
  category_he = 'עיצוב ואמנות',
  category_ar = 'التصميم والفن',
  location_he = 'מרכז עיצוב / אונליין',
  location_ar = 'مركز التصميم / عبر الإنترنت'
WHERE id = '2';

UPDATE public.activities SET
  title_he = 'התנסות מעשית בחברת הייטק',
  title_ar = 'تجربة معايشة مهنية في شركة تكنولوجيا',
  description_he = 'הצטרפות למהנדסים ואנשי מקצוע ליום עבודה אמיתי בחברת הייטק.',
  description_ar = 'قضاء يوم مع خبراء التكنولوجيا والتعرف على يوم العمل الحقيقي.',
  category_he = 'התנסות מעשית',
  category_ar = 'معايشة مهنية',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '3';

UPDATE public.activities SET
  title_he = 'יום פתוח באוניברסיטה',
  title_ar = 'يوم مفتوح في الجامعة',
  description_he = 'חקירת מסלולי לימוד, מפגש עם סטודנטים והשתתפות בהרצאות מבוא.',
  description_ar = 'استكشاف التخصصات، لقاء الطلاب، وحضور جلسות تعريفية.',
  category_he = 'סיור באקדמיה',
  category_ar = 'زيارة جامعية',
  location_he = 'ירושלים',
  location_ar = 'القدس'
WHERE id = '4';

UPDATE public.activities SET
  title_he = 'מפגש נטוורקינג מקצועי',
  title_ar = 'لقاء تواصل مهني',
  description_he = 'מפגש עם אנשי מקצוע מתחומים שונים ושאלת שאלות על תחומי קריירה.',
  description_ar = 'الالتقاء بالمهنيين وطرح الأسئلة والتعرف على المجالات المهنية.',
  category_he = 'מפגשים מקצועיים',
  category_ar = 'لقاءات مهنية',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '5';

UPDATE public.activities SET
  title_he = 'תוכנית התמחות קיץ לנוער',
  title_ar = 'برنامج تدريب صيفي للشباب',
  description_he = 'התנסות ראשונית בהתמחות עם חונכות אישית ומשימות שבועיות.',
  description_ar = 'تجربة تدريب عملي للمبتدئين مع إرشاد وتوجيه وأنشطة أسبوعية.',
  category_he = 'סטאז / התמחות',
  category_ar = 'تدريب / تدريب عملي',
  location_he = 'אונליין / מרחוק',
  location_ar = 'عبر الإنترنت'
WHERE id = '6';

UPDATE public.activities SET
  title_he = 'התנדבות במקלט בעלי חיים',
  title_ar = 'التطوع في ملجأ الحيوانات',
  description_he = 'סיוע בטיפול בבעלי חיים שחולצו ועזרה למבקרים במקלט.',
  description_ar = 'المساعدة في رعاية الحيوانات وإنقاذها ومساعدة الزوار.',
  category_he = 'התנדבות',
  category_ar = 'تطوع',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '7';

UPDATE public.activities SET
  title_he = 'פאנל שאלות ותשובות עם יזמי סטארטאפ',
  title_ar = 'حوار مع مؤسسي الشركات الناشئة',
  description_he = 'מפגש עם יזמים ומייסדי חברות ושאלות על עולם היזמות.',
  description_ar = 'الالتقاء بمؤسسي الشركات الناشئة وطرح الأسئلة حول ريادة الأعمال.',
  category_he = 'מפגשים מקצועיים',
  category_ar = 'لقاءات مهنية',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '8';

UPDATE public.activities SET
  title_he = 'סדנת הנדסת רובוטיקה',
  title_ar = 'ورشة عمل هندسة الروبوتات',
  description_he = 'בנייה ותכנות של רובוטים פשוטים בליווי מנטורים אקדמיים.',
  description_ar = 'بناء وبرمجة الروبوتات البسيطة مع موجهين من الجامعة.',
  category_he = 'סדנאות',
  category_ar = 'ورش عمل',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '9';

UPDATE public.activities SET
  title_he = 'יום התנסות מעשית באדריכלות',
  title_ar = 'يوم معايشة مهنية في الهندسة المعمارية',
  description_he = 'בילוי יום לצד אדריכלים ולמידה על תכנון ועיצוב מבנים.',
  description_ar = 'قضاء يوم مع مهندسين معماريين للتعلم حول التصميم والتخطيط.',
  category_he = 'התנסות מעשית',
  category_ar = 'معايشة مهنية',
  location_he = 'ירושלים',
  location_ar = 'القدس'
WHERE id = '10';

UPDATE public.activities SET
  title_he = 'ניקוי חופים ופארקים בהתנדבות',
  title_ar = 'حملة تنظيف البيئة والشواطئ',
  description_he = 'הצטרפות ליוזמה קהילתית לניקוי פארקים וחופים ושמירה על הסביבה.',
  description_ar = 'الانضمام إلى مبادرة مجتمعية لتنظيف الشواطئ والمتنزهات.',
  category_he = 'התנדבות',
  category_ar = 'تطوع',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '11';

UPDATE public.activities SET
  title_he = 'מבוא למחקר רפואי',
  title_ar = 'مقدمة في البحث الطبي',
  description_he = 'סיוע לחוקרים באיסוף נתונים ומחקר רפואי בסיסי.',
  description_ar = 'مساعدة مساعدي البحوث في مهام جمع البيانات الأساسية.',
  category_he = 'סטאז / התמחות',
  category_ar = 'تدريب / تدريب عملي',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '12';

UPDATE public.activities SET
  title_he = 'סיור במעבדות מדע מתקדמות',
  title_ar = 'جولة في مختبرات العلوم الجامعية',
  description_he = 'סיור במעבדות מחקר מתקדמות ומפגש עם פרופסורים וחוקרים.',
  description_ar = 'جولة في مختبرات العلوم المتقدمة والالتقاء بالأساتذة.',
  category_he = 'סיור באקדמיה',
  category_ar = 'زيارة جامعية',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '13';

UPDATE public.activities SET
  title_he = 'סדנת כתיבה יוצרת',
  title_ar = 'ورشة عمل الكتابة الإبداعية',
  description_he = 'שיפור כישורי כתיבה וסיפור סיפורים בהדרכת סופרים מקצועיים.',
  description_ar = 'تحسين مهارات الكتابة والسرد مع كتاب محترفين.',
  category_he = 'סדנאות',
  category_ar = 'ورش عمل',
  location_he = 'ירושלים',
  location_ar = 'القدס'
WHERE id = '14';

UPDATE public.activities SET
  title_he = 'התנסות במשרד עורכי דין',
  title_ar = 'معايشة مهنية في مكتب محاماة',
  description_he = 'צפייה בעורכי דין במהלך דיונים, פגישות והכנת תיקים משפטיים.',
  description_ar = 'مراقبة المحامين أثناء الاجتماعات والتحضير القانوني.',
  category_he = 'התנסות מעשית',
  category_ar = 'معايشة مهنية',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '15';

UPDATE public.activities SET
  title_he = 'התנדבות בבנק מזון קהילתי',
  title_ar = 'التطوع في بنك الطعام المجتمعي',
  description_he = 'עזרה באריזת תרומות מזון וחלוקה למשפחות נזקקות.',
  description_ar = 'المساعدة في تنظيم تبرعات الطعام ومساعدة العائلات المحتاجة.',
  category_he = 'התנדבות',
  category_ar = 'تطوع',
  location_he = 'ירושלים',
  location_ar = 'القدس'
WHERE id = '16';

UPDATE public.activities SET
  title_he = 'אירוע נטוורקינג בתעשיית ההייטק',
  title_ar = 'ملتقى تواصل في قطاع التكنولوجيا',
  description_he = 'יצירת קשרים עם מהנדסי תוכנה ועובדי חברות סטארטאפ.',
  description_ar = 'التواصل مع مهندسي البرمجيات وموظفي الشركات الناشئة.',
  category_he = 'מפגשים מקצועיים',
  category_ar = 'لقاءات مهنية',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '17';

UPDATE public.activities SET
  title_he = 'סיור לימודי במדעי המחשב באקדמיה',
  title_ar = 'زيارة جامعية لفرع علوم الحاسوب',
  description_he = 'למידה על מסלולי תואר במדעי המחשב וצפייה בפרויקטי סטודנטים.',
  description_ar = 'التعرف على درجات علوم الحاسوب ومشاريع الطلاب.',
  category_he = 'סיור באקדמיה',
  category_ar = 'زيارة جامعية',
  location_he = 'תל אביב',
  location_ar = 'تل أبيب'
WHERE id = '18';

UPDATE public.activities SET
  title_he = 'התנדבות בשימור סביבה ימית',
  title_ar = 'التطوع في حماية البيئة البحرية',
  description_he = 'סיוע לביולוגים ימיים בניטור שוניות אלמוגים ואיסוף נתונים.',
  description_ar = 'مساعدة علماء الأحياء البحرية في مراقبة الشعب المرجانية وتنظيف الشواطئ.',
  category_he = 'התנדבות',
  category_ar = 'تطوع',
  location_he = 'אילת',
  location_ar = 'إيلات'
WHERE id = '19';

UPDATE public.activities SET
  title_he = 'סדנת קיימות ואקלים',
  title_ar = 'ورشة عمل الاستدامة والمناخ',
  description_he = 'למידה על פרקטיקות קיימות והשפעה סביבתית.',
  description_ar = 'التعرف على ممارسات الاستدامة والأثر البيئي.',
  category_he = 'סדנאות',
  category_ar = 'ورش عمل',
  location_he = 'מודיעין',
  location_ar = 'موديعين'
WHERE id = '20';

UPDATE public.activities SET
  title_he = 'התנסות בניהול מלונאות',
  title_ar = 'معايشة مهنية في إدارة الفنادق',
  description_he = 'בילוי יום לצד מנהלי מלונות ולמידה על תפעול ענף המלונאות.',
  description_ar = 'قضاء يوم في متابعة مدراء الفنادق وتعلم عمليات الضيافة.',
  category_he = 'התנסות מעשית',
  category_ar = 'معايشة مهنية',
  location_he = 'אילת',
  location_ar = 'إيلات'
WHERE id = '21';

UPDATE public.activities SET
  title_he = 'כנס אבטחת מידע וסייבר',
  title_ar = 'ملتقى أمن المعلومات والسيبراني',
  description_he = 'מפגש עם מומחי אבטחת מידע וסייבר ודיון על מגוון המקצועות בתחום.',
  description_ar = 'الالتقاء بمهنيي الأمن السيبراني ومناقشة المهن في الأمان الرقمي.',
  category_he = 'מפגשים מקצועיים',
  category_ar = 'لقاءات مهنية',
  location_he = 'מודיעין',
  location_ar = 'موديعين'
WHERE id = '22';

UPDATE public.activities SET
  title_he = 'התמחות בהדרכה וחינוך נוער',
  title_ar = 'تدريب في مجال تعليم الشباب',
  description_he = 'סיוע למדריכים ואנשי חינוך בתוכניות למידה וסדנאות נוער.',
  description_ar = 'مساعدة المعلمين في برامج تعلم الشباب وورش العمل.',
  category_he = 'סטאז / התמחות',
  category_ar = 'تدريب / تدريب عملي',
  location_he = 'נצרת',
  location_ar = 'الناصرة'
WHERE id = '23';

UPDATE public.activities SET
  title_he = 'יום חשיפה ואקדמיה בצפון',
  title_ar = 'يوم استكشاف الحرم الجامعي',
  description_he = 'סיור במתקני האוניברסיטה, מפגש עם סטודנטים והשתתפות בהרצאות.',
  description_ar = 'زيارة مرافق الجامعة والالتقاء بالطلاب وحضور محاضرات مصغرة.',
  category_he = 'סיור באקדמיה',
  category_ar = 'زيارة جامعية',
  location_he = 'נצרת',
  location_ar = 'الناصرة'
WHERE id = '24';

UPDATE public.activities SET
  title_he = 'מועדון נוער לאיכות הסביבה',
  title_ar = 'نادي البيئة للشباب',
  description_he = 'תלמידים ממארגנים פרויקטים של קיימות ומסעות פרסום למודעות סביבתית.',
  description_ar = 'ينظم الطلاب مشاريع الاستدامة وحملات التوعية البيئية.',
  category_he = 'חוגים וספורט',
  category_ar = 'أنشطة لا منهجية',
  location_he = 'נצרת',
  location_ar = 'الناصرة'
WHERE id = '25';

UPDATE public.activities SET
  title_he = 'מועדון רובוטיקה',
  title_ar = 'نادي الروبوتات',
  description_he = 'הצטרפות לצוות רובוטיקה ובניית רובוטים מתוכנתים לתחרויות.',
  description_ar = 'الانضمام إلى فريق الروبوتات وبناء روبوتات قابلة للبرمجة للمسابقات.',
  category_he = 'חוגים וספורט',
  category_ar = 'أنشطة لا منهجية',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '26';

UPDATE public.activities SET
  title_he = 'מועדון צילום',
  title_ar = 'نادي التصوير الفوتوغرافي',
  description_he = 'למידת טכניקות צילום והשתתפות בתערוכות יצירתיות.',
  description_ar = 'تعلم تقنيات التصوير الفوتوغرافي والمشاركة في المعارض الإبداعية.',
  category_he = 'חוגים וספורט',
  category_ar = 'أنشطة لا منهجية',
  location_he = 'חיפה',
  location_ar = 'حيفا'
WHERE id = '27';

UPDATE public.activities SET
  title_he = 'נבחרת דיבייט ודיבור מול קהל',
  title_ar = 'فريق المناظرة المدرسية',
  description_he = 'פיתוח כישורי דיבור מול קהל, שכנוע וחשיבה ביקורתית.',
  description_ar = 'تطوير مهارات التحدث أمام الجمهور والإقناع والتفكير النقدي.',
  category_he = 'חוגים וספורט',
  category_ar = 'أنشطة لا منهجية',
  location_he = 'ירושלים',
  location_ar = 'القدس'
WHERE id = '28';
