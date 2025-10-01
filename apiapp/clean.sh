#!/bin/bash -x

rm -rf $(find -iname '__init__.py' | grep -v venv)
rm -rf $(find -type d -iname 'build' | grep -v venv)
rm -rf $(find -type d -iname '.pytest_cache' | grep -v venv)
rm -rf $(find -type d -iname '__pycache__' | grep -v venv)
rm -rf $(find -type d -iname '*egg-info' | grep -v venv)
