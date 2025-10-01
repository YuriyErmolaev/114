from app.configs.settings import get_settings

import requests


class KeycloakProvider:
    def __init__(self):
        settings = get_settings()
        self.keycloak_url = settings.keycloak_url
        self.realm = settings.keycloak_realm
        self.client_id = settings.keycloak_client_id
        self.client_secret = settings.keycloak_client_secret
        self.token_url = (
            f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token"
        )
        self.introspect_url = (
            f"{self.keycloak_url}/realms/{self.realm}/protocol/openid-connect/token/introspect"
        )

    def get_token_password(self, username: str, password: str):
        data = {
            "grant_type": "password",
            "client_id": self.client_id,
            "username": username,
            "password": password,
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret
        resp = requests.post(self.token_url, data=data)
        resp.raise_for_status()
        return resp.json()

    def get_token_client_credentials(
        self, client_id: str = None, client_secret: str = None
    ):
        data = {
            "grant_type": "client_credentials",
            "client_id": client_id or self.client_id,
        }
        if client_secret or self.client_secret:
            data["client_secret"] = client_secret or self.client_secret
        resp = requests.post(self.token_url, data=data)
        resp.raise_for_status()
        return resp.json()

    def introspect(self, token: str):
        data = {"token": token, "client_id": self.client_id}
        if self.client_secret:
            data["client_secret"] = self.client_secret
        resp = requests.post(self.introspect_url, data=data)
        resp.raise_for_status()
        return resp.json()
