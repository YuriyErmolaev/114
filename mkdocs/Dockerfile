FROM python:3.11-alpine

RUN pip install --no-cache-dir mkdocs mkdocs-material

WORKDIR /docs
COPY ./mkdocs.yml ./mkdocs.yml
COPY ./docs ./docs

EXPOSE 8000
CMD ["mkdocs", "serve", "-a", "0.0.0.0:8000"]
