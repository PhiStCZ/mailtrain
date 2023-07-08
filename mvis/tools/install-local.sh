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

installPrerequisities
installIvis http://localhost:3010 http://localhost:3011 0.0.0.0 false false


echo "MVIS successfully installed."
