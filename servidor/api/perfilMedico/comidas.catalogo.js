/**
 * Catálogo de comidas del plan alimenticio (datos puros).
 *
 * Cada comida dice qué CONTIENE (no qué no contiene): así una alergia o una dieta se
 * filtran con una sola regla y un plato nuevo no puede "colarse" por olvidar una etiqueta.
 *
 *   contiene:  carne, ave, pescado, mariscos, huevo, lacteos, gluten, frutos-secos, mani,
 *              soya, maiz, citricos, frutos-rojos, cacao, sesamo, mostaza, apio, sulfitos
 *   evitarCon: condiciones médicas para las que el plato no es la mejor opción (preferencia
 *              suave: se respeta si quedan otras opciones; una alergia o la dieta, siempre)
 *
 * Hay platos sin ningún alérgeno de la lista en cada comida del día, y suficientes platos
 * veganos (legumbres, tofu, tempeh, seitán, quinoa, proteína de arveja, semillas) para
 * cubrir la semana de una persona vegana incluso con alergias a la soya o al gluten.
 */

const DIABETES = ['Diabetes tipo 1', 'Diabetes tipo 2', 'Hipoglucemia reactiva'];
const SII = ['Síndrome de intestino irritable (SII)', 'Enfermedad de Crohn', 'Colitis ulcerosa'];
const REFLUJO = ['Reflujo gastroesofágico (ERGE)', 'Gastritis crónica'];
const GRASA_SATURADA = ['Colesterol alto (hipercolesterolemia)', 'Triglicéridos elevados'];
const SAL = ['Hipertensión arterial'];

const c = (nombre, desc, kcal, proteina, carbs, grasa, contiene = [], evitarCon = []) =>
  ({ nombre, desc, kcal, proteina, carbs, grasa, contiene, evitarCon });

const DESAYUNOS = [
  c('Arepa de maíz con huevo revuelto y aguacate', '2 arepas de maíz, 3 huevos revueltos, medio aguacate', 480, 24, 42, 22, ['maiz', 'huevo']),
  c('Avena con plátano y mantequilla de maní', '80 g de avena, 1 plátano maduro, 1 cda de mantequilla de maní', 440, 14, 68, 12, ['gluten', 'mani'], DIABETES),
  c('Avena sin gluten con bebida de arroz, manzana y canela', '70 g de avena certificada sin gluten, 250 ml de bebida de arroz, 1 manzana, canela', 380, 10, 70, 7, [], DIABETES),
  c('Batido de proteína de arveja con espinaca y plátano', '1 scoop de proteína de arveja, 1 taza de espinaca, 1 plátano, agua de coco', 320, 26, 40, 5),
  c('Tostadas integrales con aguacate y salmón ahumado', '2 tostadas integrales, medio aguacate, 80 g de salmón ahumado, chía', 460, 28, 38, 20, ['gluten', 'pescado']),
  c('Yogur griego con granola y mango', '200 g de yogur griego 0 %, 50 g de granola de avena, 1 mango', 400, 26, 54, 7, ['lacteos', 'gluten'], DIABETES),
  c('Tortilla de claras con champiñones y espinaca', '5 claras, 100 g de champiñones, espinaca, ajo, aceite de oliva', 220, 28, 6, 8, ['huevo']),
  c('Huevos pochados sobre quinoa con vegetales salteados', '2 huevos, 80 g de quinoa cocida, pimientos, cebolla y tomate', 420, 24, 46, 14, ['huevo']),
  c('Pan de arroz con queso cottage y tomate cherry', '2 rebanadas de pan de arroz, 150 g de queso cottage, tomates cherry, orégano', 340, 22, 36, 10, ['lacteos']),
  c('Porridge de chía con bebida de almendra y frutos rojos', '3 cdas de chía, 250 ml de bebida de almendra, frutos rojos, canela', 300, 10, 36, 14, ['frutos-secos', 'frutos-rojos']),
  c('Panqueques de banano, avena y huevo', '2 bananos maduros, 2 huevos, 50 g de avena, canela, sin azúcar', 380, 16, 58, 9, ['huevo', 'gluten'], DIABETES),
  c('Tofu revuelto con espinaca, tomate y pan integral', '150 g de tofu firme, cúrcuma, espinaca, tomate, 2 rebanadas de pan integral', 400, 26, 34, 16, ['soya', 'gluten']),
  c('Tostadas de masa madre con hummus y tomate', '2 tostadas de masa madre, 80 g de hummus, tomate, pimentón', 380, 14, 54, 12, ['gluten', 'sesamo']),
  c('Bowl de quinoa dulce con manzana, canela y semillas de calabaza', '80 g de quinoa cocida en bebida de arroz, 1 manzana, canela, 2 cdas de semillas de calabaza', 380, 14, 58, 10),
  c('Arepa de maíz con frijoles y aguacate', '2 arepas de maíz, 120 g de frijoles cocidos, medio aguacate', 450, 16, 62, 16, ['maiz'], SII),
  c('Batido de bebida de coco con proteína de cáñamo y espinaca', '200 ml de bebida de coco, 30 g de proteína de cáñamo, espinaca, jengibre', 300, 22, 16, 16),
  c('Smoothie bowl tropical con semillas de girasol', 'Pitahaya y mango, semillas de girasol, coco rallado y kiwi', 360, 8, 64, 10, [], DIABETES),
  c('Omelette con queso y jamón de pavo', '3 huevos, 30 g de queso, 40 g de jamón de pavo, espinaca', 380, 32, 4, 26, ['huevo', 'lacteos', 'ave'], SAL),
  c('Yogur de coco con chía, kiwi y semillas de cáñamo', '200 g de yogur de coco, 1 cda de chía, 2 kiwis, 1 cda de cáñamo', 320, 12, 30, 18),
  c('Calentado ligero de arroz y frijol con huevo', '120 g de arroz, 100 g de frijol, 1 huevo, hogao casero', 480, 22, 66, 12, ['huevo'], SII),
  c('Batido de proteína whey con avena y banano', '1 scoop de whey, 40 g de avena, 1 banano, agua o leche descremada', 420, 32, 56, 7, ['lacteos', 'gluten']),
  c('Tostadas de arroz inflado con mantequilla de girasol y banano', '3 tostadas de arroz, 1 cda de mantequilla de girasol, 1 banano', 360, 10, 52, 14),
];

const ALMUERZOS = [
  c('Pechuga de pollo a la plancha con arroz integral y ensalada verde', '180 g de pechuga, 100 g de arroz integral, lechuga, tomate y pepino', 520, 44, 52, 12, ['ave']),
  c('Filete de salmón al horno con camote y brócoli', '200 g de salmón, 150 g de camote asado, brócoli, aceite de oliva y ajo', 580, 44, 44, 22, ['pescado']),
  c('Bowl de quinoa con garbanzos, vegetales asados y tahini', '100 g de quinoa, 120 g de garbanzos, pimientos, berenjena asada, aceite de oliva, 2 cdas de tahini', 540, 22, 70, 18, ['sesamo'], SII),
  c('Lomo de res magro con puré de papa y zanahorias', '180 g de lomo de res, 150 g de puré de papa sin mantequilla, zanahorias', 560, 42, 44, 16, ['carne'], GRASA_SATURADA),
  c('Pasta de lentejas con boloñesa de lentejas y champiñones', '100 g de pasta de lentejas, 150 g de lentejas, champiñones, tomate natural, hierbas', 500, 30, 72, 8, [], SII),
  c('Pavo al horno con ensalada mediterránea y queso feta', '180 g de pavo, lechuga, tomate, pepino, aceitunas, feta, aceite de oliva', 480, 40, 18, 24, ['ave', 'lacteos']),
  c('Tofu salteado con verduras y arroz jazmín', '200 g de tofu firme, brócoli, zanahoria, pimientos, 80 g de arroz jazmín, tamari', 460, 24, 56, 14, ['soya'], SAL),
  c('Cazuela de pollo con verduras y papa criolla', '160 g de pollo, papa criolla, zanahoria, apio, caldo casero sin sal', 440, 36, 40, 12, ['ave', 'apio']),
  c('Ensalada niçoise con atún y huevo', '120 g de atún en agua, 2 huevos duros, habichuelas, tomate, aceitunas, vinagreta de mostaza', 420, 38, 20, 20, ['pescado', 'huevo', 'mostaza']),
  c('Arroz con pollo al curry suave y leche de coco', '80 g de arroz basmati, 160 g de pollo, leche de coco, cúrcuma, espinaca', 540, 38, 58, 14, ['ave']),
  c('Lentejas estofadas con chorizo de pavo', '200 g de lentejas, 80 g de chorizo de pavo, pimentón, cebolla, ajo', 520, 34, 62, 12, ['ave', 'sulfitos'], [...SAL, ...SII]),
  c('Frijoles rojos con arroz, plátano maduro y aguacate', '150 g de frijoles, 100 g de arroz, medio plátano maduro asado, aguacate', 600, 20, 96, 14, [], SII),
  c('Curry de garbanzos y espinaca con arroz basmati', '150 g de garbanzos, espinaca, tomate, leche de coco, especias, 80 g de arroz basmati', 560, 20, 80, 16, [], SII),
  c('Tempeh a la plancha con quinoa y vegetales', '150 g de tempeh, 80 g de quinoa, calabacín, pimientos, aceite de oliva', 520, 32, 50, 18, ['soya']),
  c('Seitán salteado con pimientos y arroz', '150 g de seitán, pimientos, cebolla, salsa de soya baja en sodio, 80 g de arroz', 500, 36, 58, 10, ['gluten', 'soya']),
  c('Burrito bowl de frijoles negros, arroz, maíz y guacamole', '120 g de frijoles negros, 80 g de arroz, maíz, guacamole con limón, pico de gallo', 580, 20, 90, 14, ['maiz', 'citricos'], SII),
  c('Hamburguesa de lentejas con papas al horno y ensalada', 'Hamburguesa de lentejas y harina de garbanzo, 200 g de papa al horno, ensalada verde', 540, 26, 74, 14, [], SII),
  c('Pescado blanco al vapor con arroz y vegetales', '180 g de merluza o tilapia, 80 g de arroz, zanahoria y brócoli al vapor', 460, 38, 52, 8, ['pescado']),
  c('Pollo al limón con quinoa y ensalada', '170 g de pollo marinado en limón, 80 g de quinoa, ensalada verde', 500, 42, 44, 14, ['ave', 'citricos'], REFLUJO),
  c('Carne molida magra con frijoles y arroz', '150 g de carne molida magra, 100 g de frijoles, 100 g de arroz, aguacate', 640, 42, 70, 18, ['carne'], [...GRASA_SATURADA, ...SII]),
  c('Ceviche de camarón con patacones al horno', '150 g de camarón, limón, cebolla, tomate, cilantro, patacones al horno', 420, 30, 50, 10, ['mariscos', 'citricos'], REFLUJO),
  c('Ensalada tibia de lentejas, papa y huevo duro', '150 g de lentejas, 150 g de papa, 2 huevos duros, aceite de oliva, perejil', 480, 24, 58, 14, ['huevo'], SII),
  c('Bowl de arroz integral con edamame, tofu y salsa de maní', '80 g de arroz integral, 100 g de edamame, 100 g de tofu, salsa de maní', 560, 30, 58, 22, ['soya', 'mani']),
];

const CENAS = [
  c('Sopa de vegetales con pollo desmenuzado', 'Zanahoria, apio, papa, 120 g de pollo, caldo casero sin sal, perejil', 300, 28, 28, 7, ['ave', 'apio']),
  c('Filete de tilapia al limón con ensalada de pepino', '180 g de tilapia, pepino, cebolla morada, cilantro, limón', 280, 38, 8, 9, ['pescado', 'citricos'], REFLUJO),
  c('Pechuga al horno con espárragos y papa en cubos', '160 g de pechuga, espárragos, 100 g de papa con hierbas', 380, 40, 30, 9, ['ave']),
  c('Crema de zanahoria y jengibre con tostadas de arroz', 'Crema de zanahoria con jengibre y cúrcuma, 2 tostadas de arroz', 260, 6, 48, 6),
  c('Bowl de arroz integral con edamame y verduras encurtidas', '80 g de arroz integral, 100 g de edamame, zanahoria, pepino, alga nori, tamari', 400, 18, 66, 8, ['soya'], SAL),
  c('Tortilla de huevo con vegetales', '3 huevos, pimientos, cebolla, espinaca, aceite de oliva', 280, 22, 8, 18, ['huevo']),
  c('Caldo de res con verduras y fideos de arroz', 'Caldo casero de res, fideos de arroz, zanahoria, cebollín, sin sal añadida', 320, 24, 38, 8, ['carne']),
  c('Poké vegano con tofu marinado y arroz negro', '100 g de tofu marinado, 80 g de arroz negro, edamame, mango, alga wakame', 440, 20, 62, 12, ['soya']),
  c('Muslo de pollo con vegetales asados', '160 g de muslo sin piel, pimientos, cebolla, calabacín, champiñones', 360, 34, 18, 16, ['ave']),
  c('Pasta de arroz con pesto de albahaca y piñones', '100 g de pasta de arroz, pesto de albahaca, piñones, ajo y aceite de oliva', 460, 10, 66, 18, ['frutos-secos']),
  c('Revuelto de claras con tomate y albahaca', '5 claras, 2 tomates, albahaca fresca, aceite de oliva', 180, 26, 8, 5, ['huevo']),
  c('Sopa de lentejas rojas con cúrcuma y espinaca', '120 g de lentejas rojas, zanahoria, cebolla, cúrcuma, espinaca', 360, 22, 54, 6, [], SII),
  c('Tacos de frijol negro con tortilla de maíz y pico de gallo', '3 tortillas de maíz, 120 g de frijol negro, pico de gallo con limón, aguacate', 420, 18, 66, 10, ['maiz', 'citricos'], SII),
  c('Ensalada de garbanzos, pepino, tomate y aceite de oliva', '150 g de garbanzos, pepino, tomate, cebolla morada, perejil, aceite de oliva', 380, 16, 44, 16, [], SII),
  c('Salmón a la plancha con puré de coliflor', '160 g de salmón, puré de coliflor con aceite de oliva, espinaca salteada', 420, 36, 12, 26, ['pescado']),
  c('Hamburguesa de quinoa y frijol con ensalada', 'Hamburguesa de quinoa y frijol, ensalada verde, papa al horno pequeña', 400, 18, 58, 11, [], SII),
  c('Wok de verduras con tempeh y fideos de arroz', '120 g de tempeh, brócoli, zanahoria, pimiento, 70 g de fideos de arroz', 440, 26, 54, 14, ['soya']),
  c('Crema de calabaza con semillas de calabaza y pan de arroz', 'Crema de ahuyama, 2 cdas de semillas de calabaza, 2 rebanadas de pan de arroz', 300, 10, 44, 10),
  c('Queso fresco a la plancha con verduras salteadas y arepa', '120 g de queso fresco, calabacín, pimiento, 1 arepa de maíz', 420, 26, 34, 20, ['lacteos', 'maiz'], GRASA_SATURADA),
  c('Pavo en salsa de tomate con arroz', '150 g de pavo, salsa de tomate casera, 80 g de arroz', 400, 34, 44, 9, ['ave'], REFLUJO),
];

const MERIENDAS = [
  c('Manzana con mantequilla de almendra', '1 manzana con 1 cda de mantequilla de almendra', 200, 4, 28, 9, ['frutos-secos']),
  c('Batido de proteína de arveja con agua y banano', '1 scoop de proteína de arveja, 1 banano, 300 ml de agua', 240, 24, 32, 2),
  c('Hummus con zanahoria y pepino', '80 g de hummus, bastones de zanahoria y pepino', 180, 8, 22, 7, ['sesamo']),
  c('Mix de nueces y arándanos secos', '30 g de nueces, almendras y arándanos sin azúcar añadida', 220, 6, 20, 14, ['frutos-secos'], DIABETES),
  c('Yogur griego con chía y canela', '150 g de yogur griego 0 %, 1 cda de chía, canela', 160, 18, 10, 5, ['lacteos']),
  c('Galletas de arroz con aguacate', '3 galletas de arroz, medio aguacate, sal marina', 200, 4, 28, 10),
  c('Pepino con limón y sal', '1 pepino en rodajas con limón y una pizca de sal', 60, 2, 12, 0, ['citricos'], REFLUJO),
  c('Atún en agua con galletas de arroz', '1 lata de atún en agua, 3 galletas de arroz, perejil', 180, 24, 18, 2, ['pescado']),
  c('Garbanzos tostados con especias', '60 g de garbanzos tostados al horno con pimentón y comino', 190, 9, 28, 5, [], SII),
  c('Banano con semillas de girasol', '1 banano, 1 cda de semillas de girasol', 200, 5, 32, 7, [], DIABETES),
  c('Edamame al vapor con sal marina', '120 g de edamame al vapor', 190, 17, 14, 8, ['soya']),
  c('Huevo duro con una fruta', '2 huevos duros, 1 mandarina o 1 manzana', 200, 13, 18, 10, ['huevo']),
  c('Yogur de soya con frutos rojos', '150 g de yogur de soya natural, frutos rojos', 180, 10, 24, 5, ['soya', 'frutos-rojos']),
  c('Batido de whey con agua y fresas', '1 scoop de whey, fresas, 300 ml de agua', 220, 26, 20, 3, ['lacteos', 'frutos-rojos']),
  c('Palomitas caseras de maíz con aceite de oliva', '30 g de maíz para palomitas, 1 cdta de aceite de oliva', 180, 4, 24, 8, ['maiz']),
  c('Bolitas de dátil, avena y cacao', '3 bolitas de dátil, avena y cacao puro', 220, 5, 36, 7, ['gluten', 'cacao'], DIABETES),
  c('Pera con semillas de calabaza', '1 pera, 1 cda de semillas de calabaza', 190, 7, 26, 8),
  c('Queso fresco con bocadillo de guayaba', '60 g de queso fresco, 1 bocadillo de guayaba', 220, 12, 26, 8, ['lacteos'], DIABETES),
];

/** Lo que excluye cada alergia o intolerancia (texto del formulario → ingrediente). */
const ALERGENOS = [
  [/gluten|celíaca/i, 'gluten'], [/lácteos|lactosa/i, 'lacteos'], [/huevo/i, 'huevo'], [/mariscos/i, 'mariscos'],
  [/pescado/i, 'pescado'], [/frutos secos/i, 'frutos-secos'], [/cacahuetes|maní/i, 'mani'], [/soya|soja/i, 'soya'],
  [/maíz/i, 'maiz'], [/cítricos/i, 'citricos'], [/fresas|frutos rojos/i, 'frutos-rojos'], [/chocolate|cacao/i, 'cacao'],
  [/sulfitos/i, 'sulfitos'], [/sésamo|ajonjolí/i, 'sesamo'], [/mostaza/i, 'mostaza'], [/apio/i, 'apio'],
];

/** Lo que excluye cada dieta. */
const DIETAS = {
  vegano: ['carne', 'ave', 'pescado', 'mariscos', 'huevo', 'lacteos'],
  vegetariano: ['carne', 'ave', 'pescado', 'mariscos'],
  pescetariano: ['carne', 'ave'],
};

module.exports = { DESAYUNOS, ALMUERZOS, CENAS, MERIENDAS, ALERGENOS, DIETAS };
