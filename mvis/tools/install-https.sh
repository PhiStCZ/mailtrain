#!/bin/bash

set -e

hostType="$1"

if [ hostType == "centos7" ]; then
    hostType="centos7-minimal"
elif [ hostType == "centos8" ]; then
    hostType="centos8-minimal"
fi

productId=mvis
productLabel="Mailtrain IVIS"
ivisCorePath="$(dirname $(realpath -s $0))/../ivis-core"

git submodule update --init $ivisCorePath

. $ivisCorePath/setup/functions

# API port is left local-only
performInstallHttps "$(($# - 1))" "$2" "$3" "$4" "" false

configPath="$(dirname $(realpath -s $0))/../server/config/production.yaml"
cat > $configPath <<EOT
www:
  trustedPortIsHttps: true
  sandboxPortIsHttps: true

  trustedUrlBase: https://${2}
  sandboxUrlBase: https://${3}
EOT


chown mailtrain:mailtrain -R $ivisCorePath
