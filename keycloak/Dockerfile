FROM quay.io/keycloak/keycloak:25.0.1

USER root
COPY keycloak/entrypoint.sh /opt/keycloak/entrypoint.sh
RUN chmod +x /opt/keycloak/entrypoint.sh
USER keycloak

ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_HTTP_CORS=true
ENV KC_HTTP_CORS_ORIGINS=*

COPY keycloak/config/realm.json /opt/keycloak/data/import/realm.json

ENTRYPOINT ["/opt/keycloak/entrypoint.sh"]
