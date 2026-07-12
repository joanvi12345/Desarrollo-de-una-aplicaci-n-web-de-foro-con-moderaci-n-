from pathlib import Path

import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


VECTORIZADOR_PATH = Path("vectorizador.joblib")
MODELO_PATH = Path("modelo_toxicidad.joblib")

app = FastAPI(
    title="API de Moderacion de Toxicidad",
    description="Microservicio Python para que Spring Boot consulte el modelo de IA.",
    version="1.0.0",
)


class Message(BaseModel):
    text: str = Field(..., min_length=1, description="Texto que se quiere moderar")


def cargar_modelos():
    if not VECTORIZADOR_PATH.exists() or not MODELO_PATH.exists():
        raise RuntimeError(
            "No se encuentran vectorizador.joblib y/o modelo_toxicidad.joblib. "
            "Ejecuta primero: python exportar_modelo_nb.py"
        )

    vectorizador = joblib.load(VECTORIZADOR_PATH)
    modelo = joblib.load(MODELO_PATH)
    return vectorizador, modelo


vectorizador, modelo = cargar_modelos()


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "API de moderacion activa. Usa POST /predict",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict_toxicity(msg: Message):
    texto = msg.text.strip()

    if not texto:
        raise HTTPException(status_code=400, detail="El texto no puede estar vacio.")

    vec = vectorizador.transform([texto])
    prediction = modelo.predict(vec)[0]
    probability = modelo.predict_proba(vec)[0][1]

    return {
        "is_toxic": bool(prediction),
        "probability": float(probability),
        "label": "TOXICO" if prediction == 1 else "NEUTRO",
    }
