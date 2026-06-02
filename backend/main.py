from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app=FastAPI(title="Finance Copilot AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Finance Copilot API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}