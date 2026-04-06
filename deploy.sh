#!/bin/bash

# Stop the script if any command fails
set -e

#echo "Pulling latest code..."
#git pull

echo "Installing dependencies..."
npm install

echo "Building project..."
npm run build

echo "Restarting PM2..."
pm2 restart ecosystem.config.js

echo "Deployment complete!"
