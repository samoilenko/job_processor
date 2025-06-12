#!/bin/bash

echo "Running simulated C++ job..."
sleep 1

random=$((RANDOM % 3))

if [[ $random -eq 0 ]]; then
    sleep "0.0$((30 + RANDOM % 41))"
    echo "Job succeeded."
    exit 0
elif [[ $random -eq 1 ]]; then
    sleep "0.0$((30 + RANDOM % 41))"
    echo "Job failed."
    exit 1
else
    sleep "0.0$((300 + RANDOM % 400))"
    echo "Job crashed."
    kill -SEGV $$
fi