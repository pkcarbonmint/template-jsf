#!/bin/sh
pnpm build
pnpm build:cli
pnpm batch-generate -s ./src/test-schemas -o generated-templates
