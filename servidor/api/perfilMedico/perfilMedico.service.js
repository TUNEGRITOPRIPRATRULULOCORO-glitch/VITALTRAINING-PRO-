const { query } = require('../../../base-de-datos/db');
const panel = require('../panel');
const { generarRutina } = require('./rutinas');
const nutricion = require('./nutricion');

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
// GENERADORES
// ═══════════════════════════════════════════════════════════════
function filtrarComidas(pool, alergias, preferencia, condiciones) {
  const reglasAlergias = [
    { patron: /gluten/i, clave: 'gluten', palabras: ['gluten'] },
    { patron: /lácteos|lactosa/i, clave: 'lactosa', palabras: ['lácteos', 'lactosa', 'leche', 'yogur', 'queso', 'whey', 'suero'] },
    { patron: /huevo/i, clave: 'huevo', palabras: ['huevo', 'clara'] },
    { patron: /mariscos/i, clave: 'mariscos', palabras: ['marisco', 'camarón', 'langostino', 'cangrejo'] },
    { patron: /pescado/i, clave: 'pescado', palabras: ['pescado', 'salmón', 'tilapia', 'atún', 'tuna'] },
    { patron: /frutos secos/i, clave: 'frutos-secos', palabras: ['nueces', 'almendra', 'piñones', 'pistacho', 'anacardo'] },
    { patron: /cacahuetes|maní/i, clave: 'maní', palabras: ['maní', 'cacahuate', 'mantequilla de maní'] },
    { patron: /soya|soja/i, clave: 'soya', palabras: ['soya', 'soja', 'tofu', 'edamame', 'tamari'] },
    { patron: /maíz/i, clave: 'maíz', palabras: ['maíz', 'maiz'] },
    { patron: /cítricos/i, palabras: ['cítrico', 'limón', 'naranja', 'lima'] },
    { patron: /fresas|frutos rojos/i, palabras: ['fresa', 'berries', 'frutos rojos'] },
    { patron: /chocolate|cacao/i, palabras: ['chocolate', 'cacao'] },
    { patron: /sulfitos/i, palabras: ['sulfito'] },
    { patron: /sésamo|ajonjolí/i, palabras: ['sésamo', 'ajonjolí', 'tahini'] },
    { patron: /mostaza/i, palabras: ['mostaza', 'dijon'] },
    { patron: /apio/i, palabras: ['apio'] }
  ];
  const reglasUsuario = alergias.map(alergia => reglasAlergias.find(regla => regla.patron.test(alergia))).filter(Boolean);

  const pref = preferencia.toLowerCase();
  const prefKey = pref.includes('vegetariano') ? 'vegetariano'
    : pref.includes('vegano') ? 'vegano'
    : pref.includes('bajo en carbohidratos') ? 'bajo-carbohidratos'
    : pref.includes('alto en proteína') ? 'alto-proteina'
    : pref.includes('mediterránea') ? 'mediterranea'
    : 'none';

  const comidasCompatibles = pool.filter(c => {
    const ingredientes = `${c.nombre || ''} ${c.desc || ''}`.toLowerCase();
    const restricciones = c.condicionesEvitar || [];
    const alergiaIncompatible = reglasUsuario.some(regla => {
      if (regla.clave && !(c.sinAlergenos || []).includes(regla.clave)) return true;
      return restricciones.some(restriccion => regla.palabras.some(palabra => restriccion.toLowerCase().includes(palabra)))
        || regla.palabras.some(palabra => ingredientes.includes(palabra));
    });
    if (alergiaIncompatible) return false;

    // Forzar compatibilidad estricta con la preferencia alimentaria del usuario.
    if (prefKey === 'vegetariano') {
      const nombre = (c.nombre || '').toLowerCase();
      if (nombre.includes('pollo') || nombre.includes('pescado') || nombre.includes('salmón') || nombre.includes('atún') || nombre.includes('res ') || nombre.includes('carne') || nombre.includes('pavo') || nombre.includes('muslo') || nombre.includes('filete') || nombre.includes('lomo')) return false;
      if (c.noApto.includes('vegetariano') || c.noApto.includes('vegetariano-estricto')) return false;
    }
    if (prefKey === 'vegano') {
      const nombre = (c.nombre || '').toLowerCase();
      if (nombre.includes('pollo') || nombre.includes('pescado') || nombre.includes('salmón') || nombre.includes('atún') || nombre.includes('res ') || nombre.includes('carne') || nombre.includes('pavo') || nombre.includes('huevo') || nombre.includes('yogur') || nombre.includes('queso') || nombre.includes('leche')) return false;
      if (c.noApto.includes('vegano')) return false;
    }

    // Excluir si no aplica preferencia
    if (prefKey !== 'none' && c.noApto.includes(prefKey)) return false;
    // Excluir si condición es incompatible
    const condIncompatible = condiciones.some(cond => c.condicionesEvitar?.includes(cond));
    if (condIncompatible) return false;
    return true;
  });

  if (prefKey === 'alto-proteina') return comidasCompatibles.sort((a, b) => b.proteina - a.proteina);
  if (prefKey === 'mediterranea') {
    const puntajeMediterraneo = comida => {
      const texto = `${comida.nombre || ''} ${comida.desc || ''}`.toLowerCase();
      const positivos = (texto.match(/aceite de oliva|salmón|pescado|quinoa|garbanzos|lentejas|verduras|vegetales|espinaca|tomate|aguacate|nueces|almendra/g) || []).length;
      const negativos = (texto.match(/res |carne|chorizo|embutido/g) || []).length;
      return positivos - negativos;
    };
    return comidasCompatibles.sort((a, b) => puntajeMediterraneo(b) - puntajeMediterraneo(a));
  }
  return comidasCompatibles;
}

const NOMBRES_ESTIMADOS = { peso: 'peso', altura: 'altura', edad: 'edad', sexo: 'sexo' };

/**
 * Plan semanal de comidas con calorías y macros calculados para el atleta.
 * @param perfilMedico  condiciones, alergias y preferencias
 * @param opciones      { ficha, rutina } — ficha deportiva y rutina semanal (para saber qué día
 *                      es de entreno, descanso o partido). Acepta una posición suelta por compatibilidad.
 */
function generarPlanAlimenticio(perfilMedico, opciones = {}) {
  const { condiciones = [], alergias = [], preferencias = 'Sin restricciones' } = perfilMedico;
  const { ficha = null, rutina = null } = typeof opciones === 'string' ? { ficha: { posicion: opciones } } : opciones;
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  const base = nutricion.datosBase(ficha || {});
  const tipos = rutina ? nutricion.tiposDeDia(rutina) : [];
  const tipoDe = i => tipos[i] || (i === 6 ? 'descanso' : 'entreno');

  const opcionesPorToma = {
    desayuno:       filtrarComidas(DESAYUNOS, alergias, preferencias, condiciones),
    meriendaMañana: filtrarComidas(MERIENDAS, alergias, preferencias, condiciones),
    almuerzo:       filtrarComidas(ALMUERZOS, alergias, preferencias, condiciones),
    meriendaTarde:  filtrarComidas(MERIENDAS, alergias, preferencias, condiciones),
    cena:           filtrarComidas(CENAS,     alergias, preferencias, condiciones),
  };
  const sinOpcionSegura = {
    nombre: 'Sin opción segura disponible en el catálogo',
    desc: 'Consulta con tu nutricionista para añadir una alternativa compatible con tus restricciones.',
    kcal: 0, proteina: 0, carbs: 0, grasa: 0, porcion: 1
  };

  // Estas preferencias ya ordenan el catálogo: hay que respetar ese orden al elegir
  const respetarOrden = /mediterr|alto en prote/i.test(preferencias);

  const semana = dias.map((dia, i) => {
    const objetivo = nutricion.objetivosDelDia(base, tipoDe(i), preferencias);
    const comidas = {};
    for (const [toma, parte] of Object.entries(nutricion.REPARTO)) {
      // Las dos meriendas usan el mismo catálogo: se desplaza el índice para que no se repitan
      const indice = toma === 'meriendaTarde' ? i + 1 : i;
      comidas[toma] = nutricion.elegirComida(opcionesPorToma[toma], objetivo.kcal * parte, indice, { respetarOrden }) || sinOpcionSegura;
    }
    const total = Object.values(comidas).reduce((t, c) => ({
      kcal: t.kcal + c.kcal, proteina: t.proteina + c.proteina, carbs: t.carbs + c.carbs, grasa: t.grasa + c.grasa
    }), { kcal: 0, proteina: 0, carbs: 0, grasa: 0 });
    return { dia, tipoDia: objetivo.tipoDia, objetivo, total, ...comidas };
  });

  const entreno  = semana.find(d => d.tipoDia === 'entreno')?.objetivo || nutricion.objetivosDelDia(base, 'entreno', preferencias);
  const descanso = semana.find(d => d.tipoDia === 'descanso')?.objetivo || nutricion.objetivosDelDia(base, 'descanso', preferencias);

  const notas = [];
  if (base.estimados.length)
    notas.push(`📝 Faltan datos (${base.estimados.map(c => NOMBRES_ESTIMADOS[c]).join(', ')}): se usaron valores de referencia. Complétalos en Mi Perfil para afinar el cálculo.`);
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
  if (Object.values(opcionesPorToma).some(o => !o.length))
    notas.push('⚠️ El catálogo no tiene opciones seguras para una o más comidas. Se dejaron sin asignar para evitar recomendar alimentos incompatibles; consulta a tu nutricionista.');
  if (semana.some(d => d.tipoDia === 'partido'))
    notas.push('🏆 Día de partido: comida principal 3-4 h antes (rica en carbohidratos y baja en grasa) y algo de carbohidrato rápido en el descanso.');
  const litros = l => String(l).replace('.', ',');
  notas.push(`💧 Agua: unos ${litros(descanso.aguaLitros)} L en días de descanso y ${litros(entreno.aguaLitros)} L en días de entreno.`);
  notas.push('🕐 Respeta los horarios de comida. Evita saltarte comidas antes de entrenar.');

  return {
    descripcion: `Plan personalizado · ${condiciones.length ? condiciones.slice(0,2).join(', ') : 'Sin condiciones'} · ${alergias.length ? alergias.length+' alergia(s)' : 'Sin alergias'} · ${preferencias}`,
    base: { peso: base.peso, altura: base.altura, edad: base.edad, sexo: base.sexo, deporte: base.deporte,
            posicion: base.posicion, objetivo: base.objetivo, estimados: base.estimados },
    objetivos: { entreno, descanso },
    semana,
    notas
  };
}

// ═══════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════
async function listarAtletas() {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, pm.completado
       FROM usuarios u
       LEFT JOIN perfiles_medicos pm ON pm.user_id = u.id
      WHERE u.rol IN ('Atleta', 'Futbolista') AND u.estado = 'Activo'
      ORDER BY u.nombre`
  );
  return rows;
}

/** Ficha deportiva (deporte, posición, peso, altura...) para el expediente del médico. */
async function obtenerFicha(userId) {
  const [{ rows: u }, { rows: p }] = await Promise.all([
    query('SELECT deporte_principal, posicion, peso, altura, fecha_nacimiento, pie, frecuencia, objetivo FROM usuarios WHERE id = $1', [userId]),
    query('SELECT posicion, edad, peso, altura, sexo FROM perfiles WHERE user_id = $1', [userId])
  ]);
  return u[0] ? panel.fichaDeportiva(u[0], p[0]) : null;
}

// Serialización con claves ordenadas: JSONB reordena las claves al guardar
function estable(valor) {
  if (Array.isArray(valor)) return `[${valor.map(estable).join(',')}]`;
  if (valor && typeof valor === 'object')
    return `{${Object.keys(valor).sort().map(k => JSON.stringify(k) + ':' + estable(valor[k])).join(',')}}`;
  return JSON.stringify(valor);
}

/**
 * Regenera rutina y plan de comidas con la ficha actual del atleta (peso, posición, deporte...)
 * y los guarda si cambiaron. Así un cambio en Mi Perfil se refleja sin rehacer el perfil médico.
 */
async function refrescarPlanes(userId, perfil, ficha) {
  if (!perfil || !ficha) return perfil;
  const datos = {
    condiciones:  perfil.condiciones  || [],
    alergias:     perfil.alergias     || [],
    preferencias: perfil.preferencias || 'Sin restricciones'
  };
  const rutinaSemanal   = generarRutina(datos, ficha.posicion, ficha.deporte);
  const planAlimenticio = generarPlanAlimenticio(datos, { ficha, rutina: rutinaSemanal });
  const cambio = estable(rutinaSemanal) !== estable(perfil.rutinaSemanal) || estable(planAlimenticio) !== estable(perfil.planAlimenticio);
  if (cambio) {
    await query(
      'UPDATE perfiles_medicos SET rutina_semanal = $1, plan_alimenticio = $2 WHERE user_id = $3',
      [JSON.stringify(rutinaSemanal), JSON.stringify(planAlimenticio), userId]
    );
  }
  return { ...perfil, rutinaSemanal, planAlimenticio };
}

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

async function guardar(userId, datos, posicion, deporte = 'Fútbol', ficha = null) {
  const datosNorm = {
    condiciones:  datos.condiciones  || [],
    alergias:     datos.alergias     || [],
    preferencias: datos.preferencia  || datos.preferencias || 'Sin restricciones'
  };

  const rutinaSemanal   = generarRutina(datosNorm, posicion, deporte);
  const planAlimenticio = generarPlanAlimenticio(datosNorm, { ficha: { ...(ficha || {}), posicion, deporte }, rutina: rutinaSemanal });

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

module.exports = { listarAtletas, obtener, guardar, CONDICIONES, ALERGIAS, PREFERENCIAS, obtenerFicha, refrescarPlanes, generarPlanAlimenticio };