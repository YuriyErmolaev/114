from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from fastapi.concurrency import asynccontextmanager
# import asyncio

# from app.configs.settings import get_settings

# Health and status
from app.routes.health import router as health_router
from app.routes import version

# Core: work with files, CRUD
from app.routes.core import router as core_router

app = FastAPI(
    title="Avatar",
    version="0.1.0",
    description="Система распознавания мимико-пантомимических и речевых признаков",
    root_path="/api/v1",
)

# CORS middleware using settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


#@asynccontextmanager
#async def lifespan(app: FastAPI):
#    global settings
#    settings = Settings()
#    global active_processes
#    active_processes = asyncio.Semaphore(settings.num_cores - 1)
#    yield

app.state.jobs = {}

@app.get("/")
async def read_root():
    return {"message": "API системы распознавания"}


app.include_router(health_router)
app.include_router(version.router)

app.include_router(core_router, prefix="/core", tags=["Core"])

