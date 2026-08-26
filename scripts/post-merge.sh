#!/bin/bash
# Run after pulling changes that might affect dependencies or the DB schema.
set -e
npm install
npm run db:migrate
