#!/bin/bash
# Usage: with-env.sh --env=<name>|-e=<name> <command> [args...]
# Loads .env.<name> and runs the command

e=''
args=()

for a in "$@"; do
  case $a in
    --env=*|-e=*) e=${a#*=};;
    *) args+=("$a");;
  esac
done

if [ -z "$e" ]; then
  echo "Error: --env=<name> or -e=<name> is required" >&2
  exit 1
fi

set -a
source ".env.$e"
set +a

exec "${args[@]}"
