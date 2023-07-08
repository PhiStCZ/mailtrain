#!/bin/bash

echo "Installation on Debian is not supported for now; IVIS is incompatible."
exit 1

set -e

hostType=debian10

SCRIPT_PATH=$(dirname $(realpath -s $0))
. $SCRIPT_PATH/functions
cd $SCRIPT_PATH/..

performInstallHttps "$#" "$1" "$2" "$3" "$4" "$5" "$6"
