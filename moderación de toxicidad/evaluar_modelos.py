"""Evaluación reproducible sin fuga de información del conjunto de prueba."""

import json
import time
from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC


BASE = Path(__file__).resolve().parent
DATASET = BASE / "DATASET_LIMPIO_PARA_MODELOS.csv"
RANDOM_STATE = 42


def evaluar(nombre, modelo, x_train, x_test, y_train, y_test, color, salida):
    inicio = time.time()
    modelo.fit(x_train, y_train)
    y_pred = modelo.predict(x_test)
    duracion = time.time() - inicio
    matriz = confusion_matrix(y_test, y_pred, labels=[0, 1])
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="binary", pos_label=1, zero_division=0
    )
    resultado = {
        "modelo": nombre,
        "entrenamiento": int(x_train.shape[0]),
        "prueba": int(x_test.shape[0]),
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "matriz": matriz.tolist(),
        "segundos_ajuste_y_prediccion": duracion,
    }
    disp = ConfusionMatrixDisplay(matriz, display_labels=["Neutro", "Tóxico"])
    disp.plot(cmap=color, values_format="d")
    plt.title(f"Matriz de confusión: {nombre}")
    plt.tight_layout()
    plt.savefig(BASE / salida, dpi=180)
    plt.close()
    print(json.dumps(resultado, ensure_ascii=False), flush=True)
    return resultado


def preparar_particion(textos, etiquetas, max_features):
    x_train_txt, x_test_txt, y_train, y_test = train_test_split(
        textos,
        etiquetas,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=etiquetas,
    )
    vectorizador = TfidfVectorizer(
        max_features=max_features, ngram_range=(1, 2)
    )
    x_train = vectorizador.fit_transform(x_train_txt)
    x_test = vectorizador.transform(x_test_txt)
    return x_train, x_test, y_train, y_test


def main():
    df = pd.read_csv(DATASET).dropna(subset=["texto_limpio", "toxicidad"])

    x_train, x_test, y_train, y_test = preparar_particion(
        df["texto_limpio"], df["toxicidad"], max_features=10000
    )
    resultados = [
        evaluar(
            "Naive Bayes",
            MultinomialNB(),
            x_train,
            x_test,
            y_train,
            y_test,
            "Blues",
            "matriz_confusion_nb.png",
        ),
        evaluar(
            "SVM lineal",
            SVC(kernel="linear", probability=True, random_state=RANDOM_STATE),
            x_train,
            x_test,
            y_train,
            y_test,
            "Greens",
            "matriz_confusion_svm.png",
        ),
    ]

    muestra_knn = (
        pd.concat(
            [
                df[df["toxicidad"] == etiqueta].sample(
                    n=12500, random_state=RANDOM_STATE
                )
                for etiqueta in (0, 1)
            ],
            ignore_index=True,
        )
        .sample(frac=1, random_state=RANDOM_STATE)
        .reset_index(drop=True)
    )
    xk_train, xk_test, yk_train, yk_test = preparar_particion(
        muestra_knn["texto_limpio"], muestra_knn["toxicidad"], max_features=5000
    )
    resultados.append(
        evaluar(
            "KNN",
            KNeighborsClassifier(
                n_neighbors=7,
                weights="distance",
                metric="cosine",
                algorithm="brute",
                n_jobs=-1,
            ),
            xk_train,
            xk_test,
            yk_train,
            yk_test,
            "Oranges",
            "matriz_confusion_knn.png",
        )
    )

    (BASE / "resultados_evaluacion.json").write_text(
        json.dumps(resultados, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
