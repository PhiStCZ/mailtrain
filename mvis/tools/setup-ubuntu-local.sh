#!/bin/bash

# for now should be called separately, *before* calling the mailtrain setup

set -e

hostType=ubuntu1804

productId=mvis
productLabel="Mailtrain IVIS"
ivisCorePath="$(dirname $(realpath -s $0))/../ivis-core"

SCRIPT_PATH=$ivisCorePath/setup

. $SCRIPT_PATH/functions

performInstallLocal "$#" false

chown mailtrain:mailtrain -R $ivisCorePath
