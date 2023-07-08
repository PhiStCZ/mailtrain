#!/bin/bash

set -e

hostType=ubuntu1804

productId=mvis
productLabel="Mailtrain IVIS"
ivisCorePath="$(dirname $(realpath -s $0))/../ivis-core"

. $ivisCorePath/setup/functions

performInstallLocal "$#" false

chown mailtrain:mailtrain -R $ivisCorePath
