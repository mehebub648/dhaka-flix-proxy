#!/bin/sh

# Default delay of 3 seconds if STARTUP_DELAY is not set
DELAY=${STARTUP_DELAY:-3}

echo "Starting application in ${DELAY} seconds (to prevent rapid crash loops)..."
sleep "${DELAY}"

echo "Starting node application..."
exec node index.js
