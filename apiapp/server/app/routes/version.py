from fastapi import APIRouter

version = "1.2.2"

router = APIRouter()


@router.get("/server/version")
def get_version():
    return {"version": version}
