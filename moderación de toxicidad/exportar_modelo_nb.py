import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import classification_report


DATASET_PATH = "DATASET_LIMPIO_PARA_MODELOS.csv"
VECTORIZADOR_PATH = "vectorizador.joblib"
MODELO_PATH = "modelo_toxicidad.joblib"


def main():
    # 1. Carga del dataset limpio
    df = pd.read_csv(DATASET_PATH)
    df = df.dropna(subset=["texto_limpio"])

    X = df["texto_limpio"]
    y = df["toxicidad"]

    # 2. Separación previa para evitar que TF-IDF aprenda del conjunto de prueba
    X_train_text, X_test_text, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    # 3. Ajuste exclusivo con entrenamiento y transformación separada de prueba
    vectorizador = TfidfVectorizer(max_features=10000, ngram_range=(1, 2))
    X_train = vectorizador.fit_transform(X_train_text)
    X_test = vectorizador.transform(X_test_text)

    # 4. Entrenamiento del modelo Naive Bayes sin utilizar el conjunto de prueba
    print(f"Entrenando Naive Bayes con {X_train.shape[0]} mensajes...")
    modelo_nb = MultinomialNB()
    modelo_nb.fit(X_train, y_train)

    # 5. Evaluacion rapida por consola
    y_pred = modelo_nb.predict(X_test)
    print("\nREPORTE DE CLASIFICACION")
    print(classification_report(y_test, y_pred, target_names=["Neutro", "Toxico"]))

    # 6. Exportacion para que FastAPI pueda cargarlo sin reentrenar
    joblib.dump(vectorizador, VECTORIZADOR_PATH)
    joblib.dump(modelo_nb, MODELO_PATH)

    print(f"\nVectorizador guardado en: {VECTORIZADOR_PATH}")
    print(f"Modelo guardado en: {MODELO_PATH}")


if __name__ == "__main__":
    main()
