# Dev container for GitHub Codespaces (or VS Code "Reopen in Container").
# Node 22 for the backend and dashboard, plus the Flutter SDK for the mobile app.
FROM mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm

# Match the Flutter version in mobile/.metadata so analyze/test results agree with CI and teammates.
ARG FLUTTER_VERSION=3.47.6

# postgresql-client gives `psql` and `pg_isready`; the rest are Flutter's Linux requirements.
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends postgresql-client unzip xz-utils zip libglu1-mesa \
    && rm -rf /var/lib/apt/lists/*

ENV FLUTTER_HOME=/opt/flutter
ENV PATH="${FLUTTER_HOME}/bin:${PATH}"

RUN git clone --depth 1 --branch "${FLUTTER_VERSION}" https://github.com/flutter/flutter.git "${FLUTTER_HOME}" \
    && chown -R node:node "${FLUTTER_HOME}"

# Download the Dart SDK now so the first `flutter` command in the container is fast.
USER node
RUN flutter config --no-analytics \
    && flutter --version
