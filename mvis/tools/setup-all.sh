#!/bin/bash

this_dir=$(dirname $0)

# note: this hasn't been tested yet and might not work properly
git submodule update --init "${this_dir}/../ivis-core/"
bash "${this_dir}/reinstall_modules.sh"
bash "${this_dir}/setup_db-arg-passwd.sh" "mvis"
echo "Finished. Make sure you also have ivis-core installed!"
