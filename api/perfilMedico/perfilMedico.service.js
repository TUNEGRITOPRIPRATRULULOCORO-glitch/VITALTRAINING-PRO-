const { query } = require('../../data/db');

// ═══════════════════════════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════════════════════════
const CONDICIONES = {
  musculoesqueleticas: [
    'Tendinitis crónica','Tendinitis de Aquiles','Fascitis plantar',
    'Dolor lumbar crónico','Hernia discal','Escoliosis',
    'Condromalacia rotuliana (rodilla del corredor)','Lesión de menisco',
    'Esguince de tobillo recurrente','Síndrome de la banda iliotibial',
    'Pubalgia deportiva','Periostitis tibial (shin splints)',
    'Bursitis de cadera','Epicondilitis (codo de tenista)','Artritis temprana'
  ],
  cardiorrespiratorias: [
    'Asma inducida por ejercicio','Asma alérgica','Hipertensión arterial',
    'Hipotensión arterial','Arritmia cardíaca leve','Soplo cardíaco',
    'Anemia ferropénica','Anemia por déficit de vitamina B12'
  ],
  metabolicas: [
    'Diabetes tipo 1','Diabetes tipo 2','Hipoglucemia reactiva',
    'Hipotiroidismo','Hipertiroidismo','Sobrepeso / Obesidad',
    'Colesterol alto (hipercolesterolemia)','Triglicéridos elevados'
  ],
  digestivas: [
    'Síndrome de intestino irritable (SII)','Enfermedad de Crohn',
    'Colitis ulcerosa','Reflujo gastroesofágico (ERGE)',
    'Gastritis crónica','Intolerancia a la lactosa',
    'Enfermedad celíaca / Intolerancia al gluten','Estreñimiento crónico'
  ],
  neurologicasMentales: [
    'Migraña crónica','Epilepsia','Ansiedad generalizada',
    'Depresión','Insomnio crónico','Apnea del sueño','TDAH'
  ],
  otras: [
    'Psoriasis','Dermatitis atópica','Rinitis alérgica crónica',
    'Alergia al polvo / ácaros','Acné hormonal','Déficit de vitamina D'
  ]
};

const ALERGIAS = [
  'Gluten (trigo, cebada, centeno)','Lácteos / Lactosa','Huevo',
  'Mariscos','Pescado','Frutos secos (nueces, almendras, etc.)',
  'Cacahuetes / Maní','Soya / Soja','Maíz','Cítricos (naranja, limón)',
  'Fresas / Frutos rojos','Chocolate / Cacao','Sulfitos (conservas, vino)',
  'Sésamo / Ajonjolí','Mostaza','Apio'
];

const PREFERENCIAS = [
  'Sin restricciones','Vegetariano (sin carne ni pescado)',
  'Vegano (sin productos animales)','Bajo en carbohidratos',
  'Alto en proteína','Dieta mediterránea'
];

// ═══════════════════════════════════════════════════════════════
// POOL DE COMIDAS
// Cada comida tiene: nombre, desc, kcal, proteina(g), carbs(g), grasa(g)
// sinAlergenos: alergenos que NO contiene (safe tags)
// noApto: preferencias con las que es incompatible
// condicionesOk: condiciones en las que es RECOMENDABLE
// condicionesEvitar: condiciones con las que NO es recomendable
// ═══════════════════════════════════════════════════════════════
const DESAYUNOS = [
  { nombre:'Arepa de maíz con huevo revuelto y aguacate', desc:'2 arepas de maíz, 3 huevos revueltos, medio aguacate', kcal:480, proteina:24, carbs:42, grasa:22, sinAlergenos:['gluten','mariscos','pescado','soya','frutos-secos','maní','maíz-libre'], noApto:['vegano'], condicionesOk:['Diabetes tipo 2','Diabetes tipo 1','Hipoglucemia reactiva','Enfermedad celíaca / Intolerancia al gluten'], condicionesEvitar:['Huevo'] },
  { nombre:'Avena sin gluten con plátano y mantequilla de maní', desc:'80g avena certificada sin gluten, 1 plátano maduro, 1 cda mantequilla de maní', kcal:440, proteina:14, carbs:68, grasa:12, sinAlergenos:['gluten','lactosa','mariscos','pescado'], noApto:['bajo-carbohidratos','vegano'], condicionesOk:['Anemia ferropénica','Hipotiroidismo','Insomnio crónico'], condicionesEvitar:['Cacahuetes / Maní','Hipoglucemia reactiva','Diabetes tipo 2'] },
  { nombre:'Batido de proteína vegetal con espinaca y berries', desc:'1 scoop proteína vegetal, 1 taza espinaca, 1 taza berries mixtos, agua de coco', kcal:320, proteina:28, carbs:32, grasa:6, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Enfermedad celíaca / Intolerancia al gluten','Intolerancia a la lactosa','Anemia ferropénica','Hipotiroidismo'], condicionesEvitar:['Fresas / Frutos rojos'] },
  { nombre:'Tostadas de pan integral con aguacate y salmón ahumado', desc:'2 tostadas integrales, medio aguacate, 80g salmón ahumado, semillas de chía', kcal:460, proteina:28, carbs:38, grasa:18, sinAlergenos:['lactosa','huevo','mariscos','frutos-secos','maní','soya'], noApto:['vegetariano','vegano'], condicionesOk:['Anemia ferropénica','Colesterol alto','Hipertensión arterial','Depresión','Déficit de vitamina D'], condicionesEvitar:['Gluten (trigo, cebada, centeno)','Pescado'] },
  { nombre:'Yogur griego alto en proteína con granola y mango', desc:'200g yogur griego 0%, 50g granola sin azúcar, 1 mango en trozos', kcal:400, proteina:26, carbs:54, grasa:6, sinAlergenos:['mariscos','pescado','soya'], noApto:['vegano','bajo-carbohidratos'], condicionesOk:['Ansiedad generalizada','Insomnio crónico','Gastritis crónica'], condicionesEvitar:['Lácteos / Lactosa','Gluten (trigo, cebada, centeno)','Diabetes tipo 2'] },
  { nombre:'Tortilla de clara de huevo con champiñones y espinaca', desc:'5 claras de huevo, 100g champiñones, puñado espinaca, ajo, aceite de oliva', kcal:200, proteina:28, carbs:6, grasa:7, sinAlergenos:['gluten','lactosa','mariscos','pescado','frutos-secos','maní','soya','maíz'], noApto:['vegano','vegetariano-estricto'], condicionesOk:['Diabetes tipo 1','Diabetes tipo 2','Hipoglucemia reactiva','Bajo en carbohidratos','Colesterol alto','Sobrepeso / Obesidad'], condicionesEvitar:['Huevo'] },
  { nombre:'Smoothie bowl de frutas tropicales con semillas', desc:'Base de pitahaya y mango, topped con semillas de girasol, coco rallado y kiwi', kcal:360, proteina:8, carbs:64, grasa:10, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['bajo-carbohidratos'], condicionesOk:['Estreñimiento crónico','Psoriasis','Dermatitis atópica'], condicionesEvitar:['Diabetes tipo 2','Diabetes tipo 1','Hipoglucemia reactiva'] },
  { nombre:'Huevos pochados sobre quinoa con vegetales salteados', desc:'2 huevos pochados, 80g quinoa cocida, mix de pimientos, cebolla y tomate salteados', kcal:420, proteina:24, carbs:46, grasa:12, sinAlergenos:['gluten','lactosa','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano'], condicionesOk:['Hipotiroidismo','Anemia ferropénica','Estreñimiento crónico','Enfermedad celíaca / Intolerancia al gluten'], condicionesEvitar:['Huevo'] },
  { nombre:'Pan de arroz con queso cottage y tomate cherry', desc:'2 rebanadas pan de arroz, 150g queso cottage, tomates cherry, orégano', kcal:340, proteina:22, carbs:36, grasa:10, sinAlergenos:['gluten','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano'], condicionesOk:['Enfermedad celíaca / Intolerancia al gluten','Gastritis crónica'], condicionesEvitar:['Lácteos / Lactosa'] },
  { nombre:'Porridge de chía con leche vegetal y fruta', desc:'3 cdas semillas chía, 250ml leche de almendra, frutos del bosque, canela', kcal:300, proteina:10, carbs:36, grasa:14, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','maní','soya','maíz'], noApto:[], condicionesOk:['Estreñimiento crónico','Colesterol alto','Triglicéridos elevados','Diabetes tipo 2'], condicionesEvitar:['Frutos secos (nueces, almendras, etc.)','Fresas / Frutos rojos'] },
  { nombre:'Panqueques de banana y avena sin harina', desc:'2 bananas maduras, 2 huevos, 50g avena, canela — sin azúcar añadida', kcal:380, proteina:16, carbs:58, grasa:8, sinAlergenos:['lactosa','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','bajo-carbohidratos'], condicionesOk:['Insomnio crónico','Ansiedad generalizada'], condicionesEvitar:['Huevo','Gluten (trigo, cebada, centeno)','Diabetes tipo 2'] },
  { nombre:'Batido de leche de coco con espinaca y proteína de cáñamo', desc:'200ml leche de coco, 30g proteína cáñamo, espinaca, jengibre, curcuma', kcal:280, proteina:22, carbs:14, grasa:16, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya','maíz'], noApto:[], condicionesOk:['Psoriasis','Dermatitis atópica','Artritis temprana','Depresión'], condicionesEvitar:[] }
];

const ALMUERZOS = [
  { nombre:'Pechuga de pollo a la plancha con arroz integral y ensalada verde', desc:'180g pechuga, 100g arroz integral, ensalada de lechuga, tomate, pepino con limón', kcal:520, proteina:44, carbs:52, grasa:10, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Diabetes tipo 2','Hipertensión arterial','Sobrepeso / Obesidad','Colesterol alto'], condicionesEvitar:[] },
  { nombre:'Filete de salmón al horno con camote y brócoli', desc:'200g salmón, 150g camote asado, brócoli al vapor, aceite de oliva y ajo', kcal:580, proteina:46, carbs:42, grasa:18, sinAlergenos:['gluten','lactosa','huevo','mariscos','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Anemia ferropénica','Depresión','Colesterol alto','Hipertensión arterial','Artritis temprana','Déficit de vitamina D'], condicionesEvitar:['Pescado'] },
  { nombre:'Bowl de quinoa con garbanzos, vegetales asados y tahini', desc:'100g quinoa, 120g garbanzos, pimientos, berenjena asada, 2 cdas tahini', kcal:540, proteina:22, carbs:70, grasa:16, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Anemia ferropénica','Enfermedad celíaca / Intolerancia al gluten','Estreñimiento crónico'], condicionesEvitar:['Sésamo / Ajonjolí','Colesterol alto'] },
  { nombre:'Lomo de res magro con puré de papa y zanahorias', desc:'180g lomo de res, 150g puré de papa sin mantequilla, zanahorias cocidas', kcal:560, proteina:42, carbs:44, grasa:14, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Anemia ferropénica','Periostitis tibial (shin splints)','Tendinitis crónica'], condicionesEvitar:['Colesterol alto','Triglicéridos elevados'] },
  { nombre:'Pasta de legumbre con boloñesa de lentejas y champiñones', desc:'100g pasta de lentejas, 200g lentejas cocidas, champiñones, tomate natural, hierbas', kcal:500, proteina:28, carbs:72, grasa:8, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Anemia ferropénica','Hipotiroidismo','Estreñimiento crónico','Colesterol alto'], condicionesEvitar:['Síndrome de intestino irritable (SII)','Enfermedad de Crohn'] },
  { nombre:'Pavo al horno con ensalada mediterránea y aceitunas', desc:'180g pavo asado, lechuga romana, tomate, pepino, aceitunas, feta, vinagreta', kcal:480, proteina:40, carbs:18, grasa:22, sinAlergenos:['gluten','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Diabetes tipo 2','Hipoglucemia reactiva','Bajo en carbohidratos'], condicionesEvitar:['Lácteos / Lactosa'] },
  { nombre:'Tofu orgánico salteado con verduras y arroz jazmín', desc:'200g tofu firme, brócoli, zanahoria, pimientos, 80g arroz jazmín, tamari bajo sodio', kcal:460, proteina:24, carbs:56, grasa:12, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Hipotiroidismo','Enfermedad celíaca / Intolerancia al gluten'], condicionesEvitar:['Soya / Soja','Hipertensión arterial'] },
  { nombre:'Cazuela de pollo con verduras y papa criolla', desc:'160g pollo, papa criolla, zanahoria, apio, caldo casero sin sal, cilantro', kcal:440, proteina:36, carbs:40, grasa:10, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Reflujo gastroesofágico (ERGE)','Gastritis crónica','Síndrome de intestino irritable (SII)'], condicionesEvitar:['Apio'] },
  { nombre:'Ensalada niçoise con atún, huevo y habichuelas', desc:'120g atún en agua, 2 huevos duros, habichuelas, tomate, aceitunas negras, vinagreta dijon', kcal:420, proteina:38, carbs:20, grasa:18, sinAlergenos:['gluten','lactosa','mariscos','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Bajo en carbohidratos','Alto en proteína','Diabetes tipo 2'], condicionesEvitar:['Pescado','Huevo','Mostaza'] },
  { nombre:'Wrap de lechuga con carne de res, aguacate y salsa de yogur', desc:'Hojas de lechuga, 160g carne molida magra, aguacate, tomate, salsa de yogur griego', kcal:460, proteina:36, carbs:16, grasa:26, sinAlergenos:['gluten','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Diabetes tipo 2','Bajo en carbohidratos','Enfermedad celíaca / Intolerancia al gluten'], condicionesEvitar:['Lácteos / Lactosa','Huevo'] },
  { nombre:'Arroz con pollo y vegetales al curry suave', desc:'80g arroz basmati, 160g pollo, leche de coco, cúrcuma, curry suave, espinaca', kcal:540, proteina:38, carbs:58, grasa:14, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Artritis temprana','Psoriasis','Dermatitis atópica'], condicionesEvitar:[] },
  { nombre:'Lentejas estofadas con chorizo de pavo y pimentón', desc:'200g lentejas, 80g chorizo pavo, pimentón rojo, cebolla, ajo, laurel', kcal:520, proteina:34, carbs:62, grasa:12, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Anemia ferropénica','Estreñimiento crónico'], condicionesEvitar:['Síndrome de intestino irritable (SII)','Colitis ulcerosa'] }
];

const CENAS = [
  { nombre:'Sopa de vegetales con pollo desmenuzado', desc:'Zanahoria, apio, papa, pollo, caldo casero sin sal, perejil — reconfortante y ligera', kcal:300, proteina:28, carbs:28, grasa:6, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Reflujo gastroesofágico (ERGE)','Gastritis crónica','Insomnio crónico','Síndrome de intestino irritable (SII)'], condicionesEvitar:['Apio'] },
  { nombre:'Filete de tilapia al limón con ensalada de pepino', desc:'180g tilapia al horno, ensalada de pepino, cebolla morada, cilantro, limón', kcal:280, proteina:38, carbs:8, grasa:8, sinAlergenos:['gluten','lactosa','huevo','mariscos','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Hipertensión arterial','Diabetes tipo 2','Sobrepeso / Obesidad','Colesterol alto'], condicionesEvitar:['Pescado','Cítricos (naranja, limón)'] },
  { nombre:'Pechuga al horno con espárragos y papa en cubos', desc:'160g pechuga, espárragos al horno, 100g papa en cubos condimentada con hierbas', kcal:380, proteina:40, carbs:30, grasa:8, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Diabetes tipo 2','Hipertensión arterial'], condicionesEvitar:[] },
  { nombre:'Crema de zanahoria y jengibre con tostadas de arroz', desc:'Sopa crema de zanahoria con jengibre y cúrcuma, 2 tostadas de arroz sin gluten', kcal:260, proteina:6, carbs:48, grasa:6, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:[], condicionesOk:['Reflujo gastroesofágico (ERGE)','Gastritis crónica','Artritis temprana'], condicionesEvitar:[] },
  { nombre:'Bowl de arroz integral con edamame y verduras encurtidas', desc:'80g arroz integral, 100g edamame, zanahoria encurtida, pepino, alga nori, tamari', kcal:400, proteina:18, carbs:66, grasa:8, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Estreñimiento crónico','Psoriasis'], condicionesEvitar:['Soya / Soja'] },
  { nombre:'Tortilla española sin patata con vegetales', desc:'3 huevos, pimientos, cebolla, espinaca, aceite de oliva — sin papa para bajo carb', kcal:280, proteina:22, carbs:8, grasa:18, sinAlergenos:['gluten','lactosa','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano'], condicionesOk:['Diabetes tipo 2','Bajo en carbohidratos','Sobrepeso / Obesidad'], condicionesEvitar:['Huevo'] },
  { nombre:'Caldo de res con verduras y fideos de arroz', desc:'Caldo casero de res, fideos de arroz, zanahoria, nabo, cebollín, sin sal añadida', kcal:320, proteina:24, carbs:38, grasa:8, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Tendinitis crónica','Artritis temprana','Insomnio crónico'], condicionesEvitar:[] },
  { nombre:'Poké bowl vegano con tofu marinado y arroz negro', desc:'100g tofu marinado, 80g arroz negro, edamame, mango, alga wakame, salsa ponzu', kcal:440, proteina:20, carbs:62, grasa:12, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Colesterol alto','Estreñimiento crónico'], condicionesEvitar:['Soya / Soja'] },
  { nombre:'Muslo de pollo desmenuzado con vegetales asados', desc:'160g muslo sin piel, pimientos, cebolla, calabacín, champiñones asados con hierbas', kcal:360, proteina:34, carbs:18, grasa:14, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Diabetes tipo 2','Hipoglucemia reactiva'], condicionesEvitar:[] },
  { nombre:'Pasta de arroz con pesto de albahaca y piñones', desc:'100g pasta de arroz, pesto casero (albahaca, piñones, ajo, aceite oliva, sin queso)', kcal:460, proteina:10, carbs:66, grasa:18, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','soya'], noApto:[], condicionesOk:['Enfermedad celíaca / Intolerancia al gluten','Intolerancia a la lactosa'], condicionesEvitar:['Frutos secos (nueces, almendras, etc.)'] },
  { nombre:'Revuelto de claras con tomate y albahaca fresca', desc:'5 claras de huevo, 2 tomates maduros, albahaca fresca, aceite de oliva, sal mínima', kcal:180, proteina:26, carbs:8, grasa:5, sinAlergenos:['gluten','lactosa','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano'], condicionesOk:['Hipertensión arterial','Sobrepeso / Obesidad','Diabetes tipo 2','Reflujo gastroesofágico (ERGE)'], condicionesEvitar:['Huevo'] }
];

const MERIENDAS = [
  { nombre:'Manzana con mantequilla de almendra', desc:'1 manzana mediana con 1 cda de mantequilla de almendra sin azúcar', kcal:200, proteina:4, carbs:28, grasa:9, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','soya','maíz'], noApto:[], condicionesOk:['Colesterol alto','Insomnio crónico'], condicionesEvitar:['Frutos secos (nueces, almendras, etc.)'] },
  { nombre:'Batido de proteína con agua y plátano', desc:'1 scoop proteína whey o vegetal, 1 plátano, 300ml agua fría', kcal:260, proteina:26, carbs:34, grasa:2, sinAlergenos:['gluten','mariscos','pescado','frutos-secos','maní','soya'], noApto:[], condicionesOk:['Post-entrenamiento','Alto en proteína'], condicionesEvitar:['Lácteos / Lactosa','Diabetes tipo 2'] },
  { nombre:'Hummus casero con zanahorias y apio crudos', desc:'80g hummus, bastones de zanahoria y apio — rico en fibra y proteína vegetal', kcal:180, proteina:8, carbs:22, grasa:7, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní'], noApto:[], condicionesOk:['Estreñimiento crónico','Colesterol alto'], condicionesEvitar:['Sésamo / Ajonjolí','Apio'] },
  { nombre:'Puñado de nueces mixtas y arándanos secos', desc:'30g nueces + almendras + arándanos secos sin azúcar añadida', kcal:220, proteina:6, carbs:20, grasa:14, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','soya','maíz'], noApto:[], condicionesOk:['Colesterol alto','Depresión','Ansiedad generalizada'], condicionesEvitar:['Frutos secos (nueces, almendras, etc.)','Fresas / Frutos rojos','Diabetes tipo 2'] },
  { nombre:'Yogur griego con semillas de chía y canela', desc:'150g yogur griego 0%, 1 cda semillas chía, canela al gusto — sin azúcar', kcal:160, proteina:18, carbs:10, grasa:4, sinAlergenos:['gluten','mariscos','pescado','frutos-secos','maní','soya'], noApto:['vegano'], condicionesOk:['Insomnio crónico','Ansiedad generalizada','Gastritis crónica'], condicionesEvitar:['Lácteos / Lactosa'] },
  { nombre:'Galletas de arroz con aguacate y sal de mar', desc:'3 galletas de arroz, 1/2 aguacate aplastado, pizca de sal marina y limón', kcal:200, proteina:4, carbs:28, grasa:10, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:[], condicionesOk:['Enfermedad celíaca / Intolerancia al gluten','Reflujo gastroesofágico (ERGE)'], condicionesEvitar:['Cítricos (naranja, limón)'] },
  { nombre:'Pepino con limón, sal y chamoy natural', desc:'1 pepino en rodajas con jugo de limón, sal y chamoy natural bajo en azúcar', kcal:60, proteina:2, carbs:12, grasa:0, sinAlergenos:['gluten','lactosa','huevo','mariscos','pescado','frutos-secos','maní','soya'], noApto:[], condicionesOk:['Sobrepeso / Obesidad','Diabetes tipo 2','Hipertensión arterial'], condicionesEvitar:['Cítricos (naranja, limón)'] },
  { nombre:'Tuna en agua con galletas de arroz', desc:'1 lata de atún en agua, 3 galletas de arroz, limón y perejil', kcal:180, proteina:24, carbs:18, grasa:2, sinAlergenos:['gluten','lactosa','huevo','mariscos','frutos-secos','maní','soya'], noApto:['vegano','vegetariano'], condicionesOk:['Alto en proteína','Sobrepeso / Obesidad'], condicionesEvitar:['Pescado','Cítricos (naranja, limón)'] }
];

// ═══════════════════════════════════════════════════════════════
// EJERCICIOS POR POSICIÓN Y CONDICIÓN
// ═══════════════════════════════════════════════════════════════
const EJERCICIOS = {
  fuerzaTren: [
    { nombre:'Sentadilla con peso corporal', impacto:'medio', evitar:['Condromalacia rotuliana','Lesión de menisco','Hernia discal','Dolor lumbar crónico'] },
    { nombre:'Prensa de piernas', impacto:'medio', evitar:['Condromalacia rotuliana','Lesión de menisco'] },
    { nombre:'Peso muerto rumano', impacto:'alto', evitar:['Hernia discal','Dolor lumbar crónico','Escoliosis'] },
    { nombre:'Zancadas hacia adelante', impacto:'medio', evitar:['Tendinitis de Aquiles','Fascitis plantar','Lesión de menisco'] },
    { nombre:'Hip thrust con banda', impacto:'bajo', evitar:[] },
    { nombre:'Elevaciones de talón', impacto:'bajo', evitar:['Tendinitis de Aquiles','Fascitis plantar'] },
    { nombre:'Puente de glúteos', impacto:'bajo', evitar:[] },
  ],
  fuerzaTronco: [
    { nombre:'Plancha frontal 60 seg', impacto:'bajo', evitar:['Hernia discal','Escoliosis'] },
    { nombre:'Plancha lateral', impacto:'bajo', evitar:['Escoliosis'] },
    { nombre:'Dead bug', impacto:'bajo', evitar:[] },
    { nombre:'Rotaciones con banda elástica', impacto:'bajo', evitar:['Hernia discal'] },
    { nombre:'Superman en suelo', impacto:'bajo', evitar:['Hernia discal','Dolor lumbar crónico'] },
    { nombre:'Crunch abdominal en suelo', impacto:'bajo', evitar:['Hernia discal'] },
    { nombre:'Rollout con rueda abdominal', impacto:'medio', evitar:['Hernia discal','Dolor lumbar crónico'] },
  ],
  cardio: [
    { nombre:'Carrera continua 20-30 min', impacto:'alto', evitar:['Fascitis plantar','Periostitis tibial (shin splints)','Tendinitis de Aquiles','Condromalacia rotuliana'] },
    { nombre:'Trote suave 15 min', impacto:'medio', evitar:['Fascitis plantar','Periostitis tibial (shin splints)'] },
    { nombre:'Bicicleta estática 25 min', impacto:'bajo', evitar:['Condromalacia rotuliana'] },
    { nombre:'Natación 30 min', impacto:'bajo', evitar:[] },
    { nombre:'Elíptica 25 min', impacto:'bajo', evitar:[] },
    { nombre:'Saltar cuerda 10 min', impacto:'alto', evitar:['Fascitis plantar','Tendinitis de Aquiles','Periostitis tibial (shin splints)','Esguince de tobillo recurrente'] },
    { nombre:'Remo ergómetro 20 min', impacto:'bajo', evitar:['Hernia discal','Dolor lumbar crónico'] },
  ],
  tecnica: [
    { nombre:'Control de balón — toque suave', impacto:'bajo', evitar:[] },
    { nombre:'Pases cortos en parejas', impacto:'bajo', evitar:[] },
    { nombre:'Conducción con cambio de dirección', impacto:'medio', evitar:['Esguince de tobillo recurrente'] },
    { nombre:'Dominio de balón', impacto:'bajo', evitar:[] },
    { nombre:'Tiro a portería con pierna dominante', impacto:'medio', evitar:['Pubalgia deportiva','Tendinitis de Aquiles'] },
    { nombre:'Tiro con pierna débil', impacto:'medio', evitar:['Pubalgia deportiva'] },
    { nombre:'Paredes y pases al primer toque', impacto:'bajo', evitar:[] },
  ],
  velocidadAgilidad: [
    { nombre:'Sprints 10m x 8 repeticiones', impacto:'alto', evitar:['Fascitis plantar','Periostitis tibial (shin splints)','Tendinitis de Aquiles','Arritmia cardíaca leve','Hipertensión arterial'] },
    { nombre:'Escalera de agilidad', impacto:'medio', evitar:['Esguince de tobillo recurrente','Fascitis plantar'] },
    { nombre:'Conos en zigzag', impacto:'medio', evitar:['Esguince de tobillo recurrente'] },
    { nombre:'Saltos pliométricos en caja', impacto:'alto', evitar:['Condromalacia rotuliana','Fascitis plantar','Tendinitis de Aquiles','Bursitis de cadera'] },
    { nombre:'Arranques cortos 5m', impacto:'alto', evitar:['Fascitis plantar','Tendinitis de Aquiles'] },
    { nombre:'Carrera lateral en cono', impacto:'medio', evitar:['Esguince de tobillo recurrente','Síndrome de la banda iliotibial'] },
  ],
  recuperacion: [
    { nombre:'Elongación de cuádriceps — 30 seg c/lado', impacto:'bajo', evitar:[] },
    { nombre:'Estiramiento de isquiotibiales en suelo', impacto:'bajo', evitar:[] },
    { nombre:'Foam roller en pantorrillas', impacto:'bajo', evitar:[] },
    { nombre:'Movilidad de cadera — 10 repeticiones', impacto:'bajo', evitar:[] },
    { nombre:'Respiración diafragmática — 5 min', impacto:'bajo', evitar:[] },
    { nombre:'Caminata activa 15 min', impacto:'bajo', evitar:['Fascitis plantar'] },
    { nombre:'Yoga restaurativo — 20 min', impacto:'bajo', evitar:[] },
  ]
};

const RUTINAS_BASE = {
  Portero: [
    { dia:'Lunes',    tipo:'Fuerza + Core',        grupos:['fuerzaTren','fuerzaTronco'] },
    { dia:'Martes',   tipo:'Técnica + Reflejos',   grupos:['tecnica','velocidadAgilidad'] },
    { dia:'Miércoles',tipo:'Recuperación activa',  grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Cardio + Fuerza',      grupos:['cardio','fuerzaTren'] },
    { dia:'Viernes',  tipo:'Técnica específica',   grupos:['tecnica','fuerzaTronco'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',  grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',    grupos:[] }
  ],
  'Defensa Central': [
    { dia:'Lunes',    tipo:'Fuerza + Resistencia', grupos:['fuerzaTren','cardio'] },
    { dia:'Martes',   tipo:'Técnica defensiva',    grupos:['tecnica'] },
    { dia:'Miércoles',tipo:'Recuperación activa',  grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Fuerza + Core',        grupos:['fuerzaTren','fuerzaTronco'] },
    { dia:'Viernes',  tipo:'Velocidad + Técnica',  grupos:['velocidadAgilidad','tecnica'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',  grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',    grupos:[] }
  ],
  Lateral: [
    { dia:'Lunes',    tipo:'Cardio + Velocidad',   grupos:['cardio','velocidadAgilidad'] },
    { dia:'Martes',   tipo:'Fuerza + Técnica',     grupos:['fuerzaTren','tecnica'] },
    { dia:'Miércoles',tipo:'Recuperación activa',  grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Resistencia aeróbica', grupos:['cardio','fuerzaTronco'] },
    { dia:'Viernes',  tipo:'Agilidad + Técnica',   grupos:['velocidadAgilidad','tecnica'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',  grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',    grupos:[] }
  ],
  Mediocampista: [
    { dia:'Lunes',    tipo:'Resistencia aeróbica', grupos:['cardio','fuerzaTronco'] },
    { dia:'Martes',   tipo:'Técnica + Pases',      grupos:['tecnica','velocidadAgilidad'] },
    { dia:'Miércoles',tipo:'Recuperación activa',  grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Fuerza + Cardio',      grupos:['fuerzaTren','cardio'] },
    { dia:'Viernes',  tipo:'Técnica táctica',      grupos:['tecnica','fuerzaTronco'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',  grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',    grupos:[] }
  ],
  Extremo: [
    { dia:'Lunes',    tipo:'Velocidad + Explosividad', grupos:['velocidadAgilidad','cardio'] },
    { dia:'Martes',   tipo:'Técnica + Regate',         grupos:['tecnica','velocidadAgilidad'] },
    { dia:'Miércoles',tipo:'Recuperación activa',      grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Fuerza + Velocidad',       grupos:['fuerzaTren','velocidadAgilidad'] },
    { dia:'Viernes',  tipo:'Técnica de finalización',  grupos:['tecnica','fuerzaTronco'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',      grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',        grupos:[] }
  ],
  Delantero: [
    { dia:'Lunes',    tipo:'Explosividad + Fuerza',  grupos:['velocidadAgilidad','fuerzaTren'] },
    { dia:'Martes',   tipo:'Técnica de gol',         grupos:['tecnica','velocidadAgilidad'] },
    { dia:'Miércoles',tipo:'Recuperación activa',    grupos:['recuperacion'] },
    { dia:'Jueves',   tipo:'Fuerza + Core',          grupos:['fuerzaTren','fuerzaTronco'] },
    { dia:'Viernes',  tipo:'Finalización + Técnica', grupos:['tecnica'] },
    { dia:'Sábado',   tipo:'Partido / Simulacro',    grupos:['tecnica'] },
    { dia:'Domingo',  tipo:'Descanso completo',      grupos:[] }
  ]
};

// ═══════════════════════════════════════════════════════════════
// GENERADORES
// ═══════════════════════════════════════════════════════════════
function filtrarComidas(pool, alergias, preferencia, condiciones) {
  const alergenos = alergias.map(a => {
    if (a.includes('Gluten'))    return 'gluten';
    if (a.includes('Lácteos'))   return 'lactosa';
    if (a.includes('Huevo'))     return 'huevo';
    if (a.includes('Mariscos'))  return 'mariscos';
    if (a.includes('Pescado'))   return 'pescado';
    if (a.includes('Frutos secos')) return 'frutos-secos';
    if (a.includes('Cacahuetes')) return 'maní';
    if (a.includes('Soya'))      return 'soya';
    if (a.includes('Maíz'))      return 'maíz';
    return a.toLowerCase().split(' ')[0];
  });

  const pref = preferencia.toLowerCase();
  const prefKey = pref.includes('vegetariano') ? 'vegetariano'
    : pref.includes('vegano') ? 'vegano'
    : pref.includes('bajo en carbohidratos') ? 'bajo-carbohidratos'
    : 'none';

  return pool.filter(c => {
    // Excluir si tiene alérgeno del usuario
    const tieneAlergeno = alergenos.some(al => !c.sinAlergenos.includes(al));
    if (tieneAlergeno) return false;
    // Excluir si no aplica preferencia
    if (prefKey !== 'none' && c.noApto.includes(prefKey)) return false;
    // Excluir si condición es incompatible
    const condIncompatible = condiciones.some(cond => c.condicionesEvitar?.includes(cond));
    if (condIncompatible) return false;
    return true;
  });
}

function pick(arr, idx) { return arr[idx % arr.length]; }

function generarPlanAlimenticio(perfilMedico, posicion) {
  const { condiciones = [], alergias = [], preferencias = 'Sin restricciones' } = perfilMedico;
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  const bOk = filtrarComidas(DESAYUNOS, alergias, preferencias, condiciones);
  const aOk = filtrarComidas(ALMUERZOS, alergias, preferencias, condiciones);
  const cOk = filtrarComidas(CENAS,     alergias, preferencias, condiciones);
  const mOk = filtrarComidas(MERIENDAS, alergias, preferencias, condiciones);

  const usarFallback = (pool, fallback) => pool.length ? pool : fallback;
  const B = usarFallback(bOk, DESAYUNOS);
  const A = usarFallback(aOk, ALMUERZOS);
  const C = usarFallback(cOk, CENAS);
  const M = usarFallback(mOk, MERIENDAS);

  const notas = [];
  if (condiciones.includes('Diabetes tipo 1') || condiciones.includes('Diabetes tipo 2'))
    notas.push('⚠️ Controla la glucosa antes y después de entrenar. Consulta tu médico para ajustes de dosis.');
  if (condiciones.includes('Hipertensión arterial'))
    notas.push('⚠️ Reducir el sodio al máximo. Evitar alimentos procesados y embutidos.');
  if (condiciones.includes('Anemia ferropénica'))
    notas.push('💊 Acompaña las comidas ricas en hierro con vitamina C para mejorar absorción.');
  if (condiciones.includes('Asma inducida por ejercicio') || condiciones.includes('Asma alérgica'))
    notas.push('🫁 Mantén siempre hidratación adecuada. Come 2h antes del entrenamiento.');
  if (condiciones.some(c=>c.includes('intestino') || c.includes('Crohn') || c.includes('Colitis')))
    notas.push('🍽 Come despacio, mastica bien y evita comidas copiosas antes de entrenar.');
  if (alergias.length)
    notas.push(`🚫 Alergias registradas: ${alergias.join(', ')}. Revisa siempre etiquetas de productos.`);
  notas.push('💧 Bebe mínimo 2.5L de agua al día. Aumenta a 3L en días de entrenamiento intenso.');
  notas.push('🕐 Respeta los horarios de comida. Evita saltarte comidas antes de entrenar.');

  return {
    descripcion: `Plan personalizado · ${condiciones.length ? condiciones.slice(0,2).join(', ') : 'Sin condiciones'} · ${alergias.length ? alergias.length+' alergia(s)' : 'Sin alergias'} · ${preferencias}`,
    semana: dias.map((dia, i) => ({
      dia,
      desayuno:       pick(B, i),
      meriendaMañana: pick(M, i),
      almuerzo:       pick(A, i),
      meriendaTarde:  pick(M, i+3),
      cena:           pick(C, i)
    })),
    notas
  };
}

const SERIES_DEFAULT = { bajo: { series: 3, repeticiones: null, tiempo: '30-40 seg' }, medio: { series: 3, repeticiones: 12, tiempo: null }, alto: { series: 4, repeticiones: 10, tiempo: null } };

function filtrarEjercicios(grupo, condiciones) {
  return (EJERCICIOS[grupo] || [])
    .filter(e => !e.evitar.some(ev => condiciones.some(c => c.includes(ev) || ev.includes(c.split(' ')[0]))))
    .slice(0, 4)
    .map(e => ({ nombre: e.nombre, impacto: e.impacto, ...SERIES_DEFAULT[e.impacto] }));
}

function generarRutina(perfilMedico, posicion) {
  const { condiciones = [] } = perfilMedico;
  const base = RUTINAS_BASE[posicion] || RUTINAS_BASE['Mediocampista'];
  const notas = [];

  if (condiciones.includes('Asma inducida por ejercicio') || condiciones.includes('Asma alérgica'))
    notas.push('🫁 Calentamiento prolongado de 15 min antes de cualquier actividad intensa. Lleva inhalador.');
  if (condiciones.some(c=>c.includes('rodilla') || c.includes('menisco') || c.includes('Condromalacia')))
    notas.push('🦵 Evita impacto directo en rodilla. Prioriza bicicleta y elíptica sobre correr.');
  if (condiciones.some(c=>c.includes('lumbar') || c.includes('Hernia discal') || c.includes('Escoliosis')))
    notas.push('🔙 Sin pesos muertos ni movimientos que hiperextiendan la columna.');
  if (condiciones.some(c=>c.includes('Aquiles') || c.includes('plantar') || c.includes('tibial')))
    notas.push('🦶 Usa calzado con soporte. Evita superficies duras. Estira siempre pantorrillas.');
  if (condiciones.some(c=>c.includes('Arritmia') || c.includes('cardíaco') || c.includes('Hipertensión')))
    notas.push('❤️ Monitorea frecuencia cardíaca. No superar 75% FC máxima sin autorización médica.');
  if (condiciones.includes('Diabetes tipo 1') || condiciones.includes('Diabetes tipo 2'))
    notas.push('🩸 Mide glucosa antes de entrenar. Ten snack rápido disponible (glucosa, jugo).');
  if (!notas.length) notas.push('✅ Sin restricciones especiales. Sigue el plan completo con buena técnica.');

  return {
    descripcion: `Rutina para ${posicion}${condiciones.length ? ' · adaptada a condiciones' : ''}`,
    semana: base.map(sesion => ({
      dia:       sesion.dia,
      tipo:      sesion.tipo,
      ejercicios: sesion.grupos.length
        ? sesion.grupos.flatMap(g => filtrarEjercicios(g, condiciones))
        : [],
      descanso: sesion.grupos.length === 0
    })),
    notas
  };
}

// ═══════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════
async function obtener(userId) {
  const { rows } = await query(
    'SELECT * FROM perfiles_medicos WHERE user_id = $1',
    [userId]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    userId:          r.user_id,
    condiciones:     r.condiciones,
    alergias:        r.alergias,
    preferencias:    r.preferencias,
    completado:      r.completado,
    planAlimenticio: r.plan_alimenticio,
    rutinaSemanal:   r.rutina_semanal,
    creadoEn:        r.creado_en
  };
}

async function guardar(userId, datos, posicion) {
  const datosNorm = {
    condiciones:  datos.condiciones  || [],
    alergias:     datos.alergias     || [],
    preferencias: datos.preferencia  || datos.preferencias || 'Sin restricciones'
  };

  const planAlimenticio = generarPlanAlimenticio(datosNorm, posicion);
  const rutinaSemanal   = generarRutina(datosNorm, posicion);

  await query(
    `INSERT INTO perfiles_medicos (user_id, condiciones, alergias, preferencias, completado, plan_alimenticio, rutina_semanal)
     VALUES ($1,$2,$3,$4,true,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET
       condiciones      = EXCLUDED.condiciones,
       alergias         = EXCLUDED.alergias,
       preferencias     = EXCLUDED.preferencias,
       plan_alimenticio = EXCLUDED.plan_alimenticio,
       rutina_semanal   = EXCLUDED.rutina_semanal,
       completado       = true`,
    [
      userId,
      JSON.stringify(datosNorm.condiciones),
      JSON.stringify(datosNorm.alergias),
      datosNorm.preferencias,
      JSON.stringify(planAlimenticio),
      JSON.stringify(rutinaSemanal)
    ]
  );

  return {
    userId,
    condiciones:     datosNorm.condiciones,
    alergias:        datosNorm.alergias,
    preferencias:    datosNorm.preferencias,
    completado:      true,
    planAlimenticio,
    rutinaSemanal,
    creadoEn:        new Date().toISOString()
  };
}

module.exports = { obtener, guardar, CONDICIONES, ALERGIAS, PREFERENCIAS };