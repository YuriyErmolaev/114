from fastapi.security import OAuth2
from fastapi.openapi.models import (
    OAuthFlows as OAuthFlowsModel,
    OAuthFlowPassword,
    OAuthFlowClientCredentials,
)

oauth2_scheme = OAuth2(
    flows=OAuthFlowsModel(
        password=OAuthFlowPassword(tokenUrl="/oauth/token"),
        clientCredentials=OAuthFlowClientCredentials(tokenUrl="/oauth/token"),
    )
)
