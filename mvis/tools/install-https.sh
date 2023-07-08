#!/bin/bash
set -e

hostType="$1"
if [ hostType == "centos7" ]; then
    hostType="centos7-minimal"
elif [ hostType == "centos8" ]; then
    hostType="centos8-minimal"
fi

ivisCorePath="$(dirname $(realpath -s $0))/../ivis-core"
SCRIPT_PATH="$ivisCorePath/setup"
productId=mvis
productLabel="Mailtrain IVIS"
userId=mailtrain
groupId=mailtrain

git submodule update --init $ivisCorePath

. $SCRIPT_PATH/functions

# API is left local-only
local hostTrusted="$2"
local hostSandbox="$3"
local email="$4"

installPrerequisities
installHttpd 443 443 ""
createCertificates "${hostTrusted}" "${hostSandbox}" "" "${email}"
installHttpsProxy "${hostTrusted}" 443 "${hostSandbox}" 443 "" "" "/etc/letsencrypt/live/${hostTrusted}/cert.pem" "/etc/letsencrypt/live/${hostTrusted}/privkey.pem" "/etc/letsencrypt/live/${hostTrusted}/chain.pem"
installIvis "https://${hostTrusted}" "https://${hostSandbox}" true 0.0.0.0 false "${email}"

configPath="$(dirname $(realpath -s $0))/../server/config/production.yaml"
cat > $configPath <<EOT
www:
  trustedPortIsHttps: true
  sandboxPortIsHttps: true

  trustedUrlBase: https://${2}
  sandboxUrlBase: https://${3}
EOT


echo "MVIS successfully installed."
