FROM python:3.11-slim

WORKDIR /server
ENV PYTHONPATH=/server
COPY apiapp/server .
COPY apiapp/server/predict_video_to_csv.py /server/predict_video_to_csv.py
COPY apiapp/server/avatar_animation.py /server/avatar_animation.py
COPY apiapp/server/emotions_plot.py /server/emotions_plot.py
COPY apiapp/init-app/server-start.sh /usr/local/bin/server-start.sh

ENV DATA_ROOT=
ENV PACKAGES_LIST=

# Prefer binary wheels and disable build isolation to avoid source builds (e.g., numpy)
ENV PIP_PREFER_BINARY=1 PIP_ONLY_BINARY=:all: PIP_NO_BUILD_ISOLATION=1

RUN set -x \
  && pwd && ls -la . \
  && apt update && apt install --no-install-recommends --yes python3-opencv mc procps pkg-config \
  && python3 -m venv venv

# Preinstall compatible NumPy wheel to avoid source build on Python 3.11
RUN . venv/bin/activate \
    && pip install --upgrade pip setuptools wheel \
    && pip install "numpy>=1.26,<2" --only-binary=:all: \
    && deactivate

# Install remaining requirements with binary-only wheels and no build isolation
RUN . venv/bin/activate && pip install --upgrade pip setuptools wheel && \
    pip install --only-binary=:all: -r requirements.txt && \
    deactivate

CMD ["/usr/local/bin/server-start.sh"]
