#!/bin/bash

echo "Running simulated C++ job..."
sleep 1

if ((RANDOM % 2 == 0)); then
    echo "Job succeeded."
    exit 0
else
    echo "Job failed."
    exit 1
fi
