#!/bin/sh

docker login docker.pkg.github.com -u error418 -p $GITHUB_PKG_TOKEN $ && \
docker build . --file Dockerfile --build-arg GITHUB_PKG_TOKEN=$GITHUB_PKG_TOKEN --tag docker.pkg.github.com/swingletree-oss/gate:$1 && \
docker push docker.pkg.github.com/swingletree-oss/gate:$1