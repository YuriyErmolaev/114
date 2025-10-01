FROM squidfunk/mkdocs-material:latest

COPY mkdocs/. .

RUN rm -f mkdocs.yml && mv mkdocs.public.yml mkdocs.yml
