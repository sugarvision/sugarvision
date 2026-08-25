from fastapi import FastAPI

app = FastAPI(title="SugarVision API", version="1.0.0")


@app.get("/")
def read_root():
    return {"status": "servidor online"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
