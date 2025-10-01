#!/bin/bash -x

# `server-start.sh` script usage
#
#  volumes:
#    - ${STORAGE_ROOT:-/mnt/share/ai_data}:${APP_STORAGE_ROOT:-/ai_data}:z,rw
#  environment:
#    DATA_ROOT: ${APP_STORAGE_ROOT:-/ai_data}
#    SRC_ROOT: ${APP_SRC_ROOT:-/server}
#    ENABLED_PATHS_CONF: ${APP_ENABLED_PATHS:-/app/config/paths.json}
#    ENABLED_ROUTES_CONF: ${APP_ENABLED_ROUTES:-/app/config/routes.json}
#  command: [ "/usr/local/bin/server-start.sh"
#

SRC_ROOT=${SRC_ROOT:-/server}

#DEPRICATED by kat: remove it
PACKAGES_LIST=${PACKAGES_LIST:-}

echo "Starting custom server from "$(pwd)" with environment:"
echo -e "\tDATA_ROOT=${DATA_ROOT}"
echo -e "\tSRC_ROOT=${SRC_ROOT}"
echo -e "\tENABLED_PATHS_CONF=${ENABLED_PATHS_CONF}"
echo -e "\tENABLED_ROUTES_CONF=${ENABLED_ROUTES_CONF}"

#DEPRICATED by kat: remove id
echo -e "\tPACKAGES_LIST=${PACKAGES_LIST}"

cd ${SRC_ROOT}
ls -la .

ls -la ${DATA_ROOT}

if [ ! -e 'venv' ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# TODO: write and apply the python script for do it by json-config
if [ ! -z "${PACKAGES_LIST}" ]; then
    for package in ${PACKAGES_LIST}; do
        echo "Try to install ${package}..."
        cd ${package}/src
        if [ -e 'requirements.txt' ]; then
            pip install -r requirements.txt
        fi
        if [ -e 'setup.py' ]; then
            python3 setup.py build
        fi
        pip install -e .
        cd ../..
    done
fi

if [ -e 'requirements.txt' ]; then
  pip install -r requirements.txt
fi

if [ -e 'app/requirements.txt' ]; then
  pip install -r app/requirements.txt
fi

exec python3 -m main
