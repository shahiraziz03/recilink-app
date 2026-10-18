#!/bin/bash
IP=$(ipconfig getifaddr en0)

if [ -z "$IP" ]; then
  echo "Could not detect WiFi IP. Are you connected to WiFi?"
  exit 1
fi

echo "EXPO_PUBLIC_API_URL=http://$IP:8000/api/v1" > .env
echo "IP set to $IP"
