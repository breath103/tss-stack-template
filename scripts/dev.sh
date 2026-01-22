#!/bin/bash

trap 'kill 0' SIGINT SIGTERM

concurrently \
  --kill-others \
  -n edge,backend,types,frontend \
  -c magenta,blue,yellow,green \
  "npm run dev -w @app/edge" \
  "npm run dev -w @app/backend" \
  "npm run dev:types -w @app/backend" \
  "npm run dev -w @app/frontend"
