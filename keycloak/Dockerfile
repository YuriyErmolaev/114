# Minimal Keycloak image based on official
FROM quay.io/keycloak/keycloak:24.0.4

# Install curl for healthcheck
USER root
RUN microdnf install -y curl && microdnf clean all || true
USER 1000

# By default we will run in dev mode; can be overridden by compose
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev"]
