from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth, transactions, imports, categorize, analytics

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance Copilot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(imports.router) 
app.include_router(categorize.router)
app.include_router(analytics.router)

@app.get("/health")
def health():
    return {"status": "ok"}