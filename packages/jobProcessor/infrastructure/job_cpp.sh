#!/bin/bash

echo "Running simulated C++ job..."
sleep 1

if ((RANDOM % 2 == 0)); then
    sleep "0.0$((30 + RANDOM % 41))"
    echo "Job succeeded."
    exit 0
else
    sleep "0.0$((30 + RANDOM % 41))"
    echo "Job failed."
    exit 1
fi
