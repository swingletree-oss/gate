#!/bin/bash

echo $GITHUB_PKG_TOKEN | docker login docker.pkg.github.com --username error418 && \
docker build . --file Dockerfile --build-arg GITHUB_PKG_TOKEN=$GITHUB_PKG_TOKEN --tag docker.pkg.github.com/swingletree-oss/gate:$1 && \
docker push docker.pkg.github.com/swingletree-oss/gate:$1