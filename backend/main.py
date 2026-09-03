from fastapi import FastAPI
from database import check_connection

app = FastAPI(title="SugarVision API", version="1.0.0")


@app.get("/")
def read_root():
    return {"status": "servidor online"}


@app.get("/health")
def health_check():
    """Verifica o status da API e a conexão com o banco de dados na nuvem."""
    db_status = check_connection()
    return {
        "api": "online",
        "database": db_status,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
