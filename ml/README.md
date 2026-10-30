# 🧠 Modelo de machine learning: entender lo que escribe el atleta

Vita, el asistente de VitalTraining, recibe mensajes libres ("dormí fatal", "¿puedo entrenar hoy?", "qué como antes del partido"). Este modelo **clasifica cada mensaje en una de 17 intenciones** para que la app dé la respuesta que corresponde, sin pagar una IA externa.

## El problema

**Clasificación de texto supervisada, multiclase.**

- **Entrada:** el mensaje del atleta, texto corto en español, a veces sin tildes o con errores.
- **Salida:** la intención y la probabilidad de cada una.

| Intención | Ejemplo |
|---|---|
| `entrenar_hoy` | "¿hoy entreno o descanso?" |
| `fatiga` | "estoy reventado" |
| `sueno` | "dormí fatal" |
| `recuperacion` | "tengo agujetas" |
| `riesgo` | "me torcí el tobillo" |
| `sobrecarga` | "¿estoy entrenando demasiado?" |
| `calorias` | "¿cuántas calorías necesito?" |
| `nutricion` | "¿cuánta proteína necesito?" |
| `alimentacion_personalizada` | "¿qué desayuno?" |
| `partido` | "tengo partido el sábado, ¿cómo me preparo?" |
| `entrenamiento_personalizado` | "dame una rutina de gimnasio" |
| `mejorar` | "¿en qué estoy fallando?" |
| `resumen` | "¿cómo voy esta semana?" |
| `alertas` | "¿tengo alertas?" |
| `saludo` · `gracias` · `fuera_tema` | "hola" · "mil gracias" · "cuéntame un chiste" |

## Los datos

- [`datos/intenciones.csv`](datos/intenciones.csv): **782 frases** escritas a mano y etiquetadas, entre 34 y 54 por intención.
- Incluyen variantes reales: sin tildes ("dormi pesimo"), modismos ("estoy reventado", "quiubo"), mayúsculas y signos ("Tengo PARTIDO el sábado!!").
- Se quitan las frases duplicadas antes de entrenar.

## Cómo se convierte el texto en números

**TF-IDF por trozos de letras** (`char_wb`, de 2 a 4 caracteres dentro de cada palabra):

- "dormí" → `" d"`, `"do"`, `"or"`, `"rm"`, `"mi"`, `"i "`, `" do"`, `"dor"`… Por eso "dormí", "dormi" y "dormii" se parecen mucho para el modelo.
- Antes se pasa todo a minúsculas y sin tildes (`strip_accents="unicode"`).
- **TF sublineal** (`1 + ln(frecuencia)`) e **IDF**: los trozos que aparecen en casi todas las frases ("es", "qu") pesan poco; los distintivos ("agujet", "calor") pesan mucho.

## Elección del algoritmo

Se compararon tres algoritmos con **validación cruzada estratificada de 5 particiones**, con el mismo TF-IDF:

| Algoritmo | Precisión media |
|---|---|
| Naive Bayes multinomial | 0,760 ± 0,016 |
| **Regresión logística** | **0,798 ± 0,024** |
| SVM lineal | 0,795 ± 0,022 |

**Elegida: regresión logística multinomial** (C = 10). Empata con la SVM, pero además da **probabilidades**: la app sabe cuándo el modelo duda y no adivina.

También se probaron trozos más largos (2-5, 3-5) y combinarlos con palabras completas. Todas las variantes quedaron entre 0,79 y 0,80, dentro del margen de error, así que se dejó la más simple. **Lo que más mejoró el modelo fue añadir datos:** de 499 a 782 frases, la precisión subió de 0,75 a 0,80.

## Resultados

Se separa un **20 % de frases que el modelo nunca ve al entrenar** (157 frases, división estratificada con semilla 42):

| Métrica | Valor |
|---|---|
| **Precisión (accuracy)** | **80,9 %** |
| F1 macro | 0,807 |
| Top-2: la intención correcta está entre las dos más probables | 91,1 % |

El informe completo por intención y la **matriz de confusión** están en [`resultados/reporte.txt`](resultados/reporte.txt), y las frases que confundió en [`resultados/metricas.json`](resultados/metricas.json).

Las confusiones más frecuentes son entre intenciones muy parecidas: *nutrición* frente a *qué comer*, o *mejorar* frente a *rutina*.

### Umbral de confianza

Un modelo que se equivoca 2 de cada 10 veces no debe responder siempre. Se calculó qué pasa al exigir una confianza mínima:

| Umbral | Frases que responde | Precisión en esas frases |
|---|---|---|
| 0,20 | 94 % | 86 % |
| 0,30 | 83 % | 89 % |
| **0,35** | **78 %** | **92 %** ← elegido |
| 0,45 | 69 % | 94 % |
| 0,55 | 54 % | 98 % |

Se elige el umbral que responde más frases con **al menos 90 % de aciertos**.

## Cómo lo usa la app

1. `entrenar.py` exporta el modelo a [`servidor/api/ia/modelo-intenciones.json`](../servidor/api/ia/modelo-intenciones.json): vocabulario, IDF, pesos e interceptos.
2. [`servidor/api/ia/clasificador.js`](../servidor/api/ia/clasificador.js) repite en Node.js las mismas cuentas que scikit-learn. **El servidor no necesita Python.** Un test ([`__tests__/clasificador.test.js`](../__tests__/clasificador.test.js)) comprueba que da las mismas probabilidades que Python, hasta 4 decimales.
3. En el chat ([`servidor/api/ia/asistente.js`](../servidor/api/ia/asistente.js)):
   - **Si la confianza es de 0,35 o más**, responde según la intención, con los datos reales del atleta.
   - **Si el modelo duda**, prueba con un detector de palabras clave (el plan B).
   - **Si tampoco**, pregunta: "¿Me preguntas por *X* o por *Y*?", con las dos intenciones más probables.
   - **Ante una posible lesión** recuerda siempre consultar al médico.

## Entrenarlo de nuevo

Necesitas Python 3.10 o más nuevo.

```bash
pip install -r ml/requirements.txt
python ml/entrenar.py
```

Tarda unos 3 segundos. Muestra la comparación de algoritmos, las métricas y el umbral, y actualiza el modelo de la app y los archivos de `resultados/`. Para mejorarlo, añade frases a `datos/intenciones.csv` y vuelve a entrenar. Después pasa los tests (`npm test`) para comprobar que Node.js sigue dando lo mismo que Python.

## Límites

- Lo entrenan 782 frases escritas a mano, no conversaciones reales. Con el tiempo convendría etiquetar mensajes reales (anónimos) del chat.
- Reconoce **la intención, no los detalles**: entiende "me duele la rodilla" como posible lesión, pero no extrae qué parte del cuerpo es.
- Si una frase mezcla dos temas, elige solo uno.
