#!/bin/bash
set -e

echo ">> Importing realm from /opt/keycloak/data/import/realm.json..."
/opt/keycloak/bin/kc.sh import --file /opt/keycloak/data/import/realm.json

echo ">> Starting Keycloak in dev mode..."
exec /opt/keycloak/bin/kc.sh start-dev
