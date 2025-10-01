FROM python:3.11-slim

WORKDIR /server

COPY apiapp/server .
COPY apiapp/init-app/server-start.sh /usr/local/bin/server-start.sh

ENV DATA_ROOT=
ENV PACKAGES_LIST=

RUN set -x \
  && pwd && ls -la . \
  && apt update && apt install --no-install-recommends --yes python3-opencv mc procps pkg-config \
  && python3 -m venv venv  \
  && . venv/bin/activate \
  && if [ -e "requirements.txt" ]; then pip install -r requirements.txt; fi \
  && deactivate 

CMD ["/usr/local/bin/server-start.sh"]
