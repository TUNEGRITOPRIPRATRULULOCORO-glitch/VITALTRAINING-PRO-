"""
Entrena el clasificador de intenciones de Vita (asistente de VitalTraining).

Qué hace:
  1. Lee las frases de ejemplo etiquetadas (datos/intenciones.csv).
  2. Compara tres algoritmos con validación cruzada (5 particiones) para elegir uno con datos.
  3. Evalúa el elegido con un 20 % de frases que no ve al entrenar: precisión, F1 por
     intención y matriz de confusión (resultados/).
  4. Lo vuelve a entrenar con todas las frases y lo exporta a JSON para que el servidor
     Node.js lo use sin necesitar Python (servidor/api/ia/modelo-intenciones.json).

Uso (desde la carpeta del proyecto):
  python ml/entrenar.py
"""
import json
import time
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
from sklearn.svm import LinearSVC

RAIZ = Path(__file__).resolve().parent
DATOS = RAIZ / "datos" / "intenciones.csv"
RESULTADOS = RAIZ / "resultados"
MODELO_JSON = RAIZ.parent / "servidor" / "api" / "ia" / "modelo-intenciones.json"
SEMILLA = 42
UMBRALES = [round(0.15 + 0.05 * i, 2) for i in range(10)]  # 0.15 … 0.60
PRECISION_MINIMA = 0.90  # cuando el modelo responde, debe acertar al menos 9 de cada 10

# Texto → números. Trozos de 2 a 4 letras dentro de cada palabra ("char_wb"): así el modelo
# reconoce "dormí", "dormi" y "dormii", y aguanta errores de escritura y frases sin tildes.
PARAMETROS_TFIDF = dict(
    analyzer="char_wb",
    ngram_range=(2, 4),
    lowercase=True,
    strip_accents="unicode",
    sublinear_tf=True,
    min_df=1,
)


def vectorizador():
    return TfidfVectorizer(**PARAMETROS_TFIDF)


def regresion_logistica():
    # C alto: poca regularización, porque las frases son cortas y hay pocos ejemplos por intención
    return LogisticRegression(C=10, max_iter=5000, random_state=SEMILLA)


def cargar_datos():
    datos = pd.read_csv(DATOS)
    datos["texto"] = datos["texto"].str.strip()
    datos = datos.drop_duplicates(subset="texto")
    return datos


def comparar_modelos(textos, etiquetas):
    """Precisión media con validación cruzada estratificada de 5 particiones."""
    candidatos = {
        "Naive Bayes multinomial": make_pipeline(vectorizador(), MultinomialNB(alpha=0.1)),
        "Regresión logística": make_pipeline(vectorizador(), regresion_logistica()),
        "SVM lineal": make_pipeline(vectorizador(), LinearSVC(C=1, random_state=SEMILLA)),
    }
    particiones = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEMILLA)
    resultados = {}
    for nombre, modelo in candidatos.items():
        puntajes = cross_val_score(modelo, textos, etiquetas, cv=particiones, scoring="accuracy")
        resultados[nombre] = {"media": float(puntajes.mean()), "desviacion": float(puntajes.std())}
    return resultados


def evaluar(textos, etiquetas):
    """Entrena con el 80 % y examina con el 20 % que el modelo no vio."""
    x_ent, x_prueba, y_ent, y_prueba = train_test_split(
        textos, etiquetas, test_size=0.2, stratify=etiquetas, random_state=SEMILLA
    )
    modelo = make_pipeline(vectorizador(), regresion_logistica())
    modelo.fit(x_ent, y_ent)
    predicho = modelo.predict(x_prueba)
    clases = list(modelo.classes_)
    probas = modelo.predict_proba(x_prueba)
    confianza = probas.max(axis=1)
    acierta = np.array(predicho) == np.array(y_prueba)
    # Top-2: la intención correcta está entre las dos más probables
    dos_mejores = np.argsort(probas, axis=1)[:, -2:]
    top2 = float(np.mean([clases.index(r) in fila for r, fila in zip(y_prueba, dos_mejores)]))
    # Umbral de confianza: por debajo, la app no se fía del modelo y usa su plan B
    umbrales = []
    for u in UMBRALES:
        cubiertas = confianza >= u
        umbrales.append({
            "umbral": u,
            "cobertura": float(cubiertas.mean()),
            "precision": float(acierta[cubiertas].mean()) if cubiertas.any() else 1.0,
        })
    validos = [x for x in umbrales if x["precision"] >= PRECISION_MINIMA]
    elegido = max(validos, key=lambda x: x["cobertura"])["umbral"] if validos else 0.35
    return {
        "top2": top2,
        "umbrales": umbrales,
        "umbral": elegido,
        "frases_entrenamiento": len(x_ent),
        "frases_prueba": len(x_prueba),
        "precision": float(accuracy_score(y_prueba, predicho)),
        "f1_macro": float(f1_score(y_prueba, predicho, average="macro")),
        "reporte": classification_report(y_prueba, predicho, zero_division=0),
        "matriz": confusion_matrix(y_prueba, predicho, labels=clases),
        "clases": clases,
        "errores": [
            {"texto": t, "real": r, "predicho": p}
            for t, r, p in zip(x_prueba, y_prueba, predicho) if r != p
        ],
    }


def matriz_como_texto(matriz, clases):
    abreviadas = [c[:10] for c in clases]
    ancho = max(len(c) for c in clases) + 2
    filas = [" " * ancho + " ".join(f"{a:>10}" for a in abreviadas)]
    for clase, fila in zip(clases, matriz):
        filas.append(f"{clase:<{ancho}}" + " ".join(f"{v:>10}" for v in fila))
    return "\n".join(filas)


def exportar(modelo, metricas, comparacion, total_frases):
    """Guarda lo necesario para predecir en Node.js: vocabulario, idf, pesos e interceptos."""
    tfidf, clasificador = modelo.named_steps["tfidfvectorizer"], modelo.named_steps["logisticregression"]
    vocabulario = {ngrama: int(i) for ngrama, i in tfidf.vocabulary_.items()}
    exportado = {
        "version": 1,
        "entrenado": date.today().isoformat(),
        "algoritmo": "TF-IDF (char_wb 2-4) + regresión logística multinomial (scikit-learn)",
        "frases": total_frases,
        "umbral_confianza": metricas["umbral"],
        "metricas": {
            "precision_prueba": round(metricas["precision"], 4),
            "top2_prueba": round(metricas["top2"], 4),
            "f1_macro_prueba": round(metricas["f1_macro"], 4),
            "validacion_cruzada": comparacion,
        },
        "vectorizador": {
            "analizador": "char_wb",
            "ngramas": list(PARAMETROS_TFIDF["ngram_range"]),
            "tf_sublineal": True,
            "vocabulario": vocabulario,
            "idf": [round(float(v), 6) for v in tfidf.idf_],
        },
        "clases": [str(c) for c in clasificador.classes_],
        "coeficientes": [[round(float(v), 5) for v in fila] for fila in clasificador.coef_],
        "interceptos": [round(float(v), 5) for v in clasificador.intercept_],
    }
    MODELO_JSON.write_text(json.dumps(exportado, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return MODELO_JSON.stat().st_size


def muestras_para_node(modelo):
    """Predicciones de scikit-learn que el test de Node.js debe reproducir igual."""
    frases = [
        "hola vita", "puedo entrenar hoy?", "dormí fatal anoche", "me duele mucho la rodilla",
        "qué como antes del partido", "dame una rutina de gimnasio", "cuántas calorías necesito",
        "estoy reventado", "cómo voy esta semana", "cuéntame un chiste", "dormi pesimo",
        "Tengo PARTIDO el sábado!!", "que desayuno sin huevo", "estoy sobreentrenado?", "gracias crack",
    ]
    probabilidades = modelo.predict_proba(frases)
    return [
        {"texto": f, "intencion": str(modelo.classes_[int(np.argmax(p))]), "confianza": round(float(np.max(p)), 6)}
        for f, p in zip(frases, probabilidades)
    ]


def main():
    inicio = time.time()
    RESULTADOS.mkdir(exist_ok=True)
    datos = cargar_datos()
    textos, etiquetas = datos["texto"].tolist(), datos["intencion"].tolist()
    print(f"Frases: {len(textos)} · intenciones: {datos['intencion'].nunique()}")
    print(datos["intencion"].value_counts().to_string(), "\n")

    print("1) Comparación de algoritmos (validación cruzada, 5 particiones)")
    comparacion = comparar_modelos(textos, etiquetas)
    for nombre, r in comparacion.items():
        print(f"   {nombre:<26} precisión {r['media']:.3f} ± {r['desviacion']:.3f}")
    print("   Elegido: regresión logística (da probabilidades: la app sabe cuándo el modelo duda)\n")

    print("2) Evaluación con frases que el modelo no vio (20 %)")
    m = evaluar(textos, etiquetas)
    print(f"   Precisión: {m['precision']:.3f} · F1 macro: {m['f1_macro']:.3f}")
    print(f"   Top-2 (la correcta está entre las dos más probables): {m['top2']:.3f}")
    print(f"   Entrenamiento: {m['frases_entrenamiento']} frases · prueba: {m['frases_prueba']} frases\n")
    print("   Umbral · frases que responde · precisión en esas frases")
    for x in m["umbrales"]:
        marca = "   <- elegido" if x["umbral"] == m["umbral"] else ""
        print(f"   {x['umbral']:.2f}     {x['cobertura']:>4.0%}      {x['precision']:.3f}{marca}")
    print()
    print(m["reporte"])
    if m["errores"]:
        print("   Frases que confundió:")
        for e in m["errores"]:
            print(f"   - \"{e['texto']}\": era {e['real']}, dijo {e['predicho']}")

    (RESULTADOS / "reporte.txt").write_text(
        f"Precisión: {m['precision']:.4f}\nF1 macro: {m['f1_macro']:.4f}\n\n{m['reporte']}\n"
        f"Matriz de confusión (filas: real, columnas: predicho)\n{matriz_como_texto(m['matriz'], m['clases'])}\n",
        encoding="utf-8",
    )
    (RESULTADOS / "metricas.json").write_text(json.dumps({
        "precision": m["precision"], "f1_macro": m["f1_macro"], "top2": m["top2"],
        "umbral": m["umbral"], "umbrales": m["umbrales"],
        "validacion_cruzada": comparacion, "errores": m["errores"],
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n3) Modelo final con todas las frases y exportación para la app")
    final = make_pipeline(vectorizador(), regresion_logistica())
    final.fit(textos, etiquetas)
    tamano = exportar(final, m, comparacion, len(textos))
    (RESULTADOS / "muestras_prediccion.json").write_text(
        json.dumps(muestras_para_node(final), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"   {MODELO_JSON.relative_to(RAIZ.parent)} ({tamano / 1024:.0f} KB)")
    print(f"   Listo en {time.time() - inicio:.1f} s")


if __name__ == "__main__":
    main()
