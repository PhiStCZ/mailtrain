#!/bin/bash

if [ $# -lt 1 ]; then
  MYSQL_PASSWORD=`pwgen 12 -1`
else
  MYSQL_PASSWORD="$1";
fi

# Setup MySQL user for Mailtrain
# by the way, isn't login as root supposed to happen through sudo?
# so sudo mysql -u root -e "CREATE ..."
mysql -u root -p -e "CREATE USER 'mvis'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON mvis.* TO 'mvis'@'localhost';"
mysql -u mvis --password="$MYSQL_PASSWORD" -e "CREATE database mvis;"


cat >> "$(realpath $(dirname $0))/../server/config/production.yaml" <<EOT
mysql:
  password: $MYSQL_PASSWORD
EOT
