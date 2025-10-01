from pydantic import BaseModel, ConfigDict


class TokenData(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    active: bool
    exp: int
    iat: int
    sub: str
    scope: str | None = None
