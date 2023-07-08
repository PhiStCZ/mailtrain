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

performInstallLocal "$(($# - 1))" false

chown mailtrain:mailtrain -R $ivisCorePath
