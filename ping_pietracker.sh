#!/bin/bash
# Simple ping script for cron jobs
# Add to crontab with: */10 * * * * /path/to/ping_pietracker.sh

URL="https://pietracker.onrender.com/health"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] Pinging PieTracker..."

# Ping the health endpoint
if curl -f -s -o /dev/null --max-time 30 "$URL"; then
    echo "[$TIMESTAMP] ✅ PieTracker is awake!"
else
    echo "[$TIMESTAMP] ⚠️  Ping failed, but app might still be starting..."
fi