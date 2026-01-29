#!/bin/bash
# Usage: with-env.sh [--env=<name>|-e=<name>] <command> [args...]
# Loads .env (or .env.<name>) and runs the command

e=''
args=()

for a in "$@"; do
  case $a in
    --env=*|-e=*) e=${a#*=};;
    *) args+=("$a");;
  esac
done

set -a
source ".env${e:+.}$e"
set +a

exec "${args[@]}"
