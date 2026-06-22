#!/usr/bin/env python3
"""
Simple script to keep your Render app awake by pinging it periodically.
Run this locally or on any server to prevent your app from sleeping.
"""

import requests
import time
import datetime
from typing import Optional

class AppKeepAlive:
    def __init__(self, url: str, interval_minutes: int = 10):
        self.url = url.rstrip('/')
        self.interval_seconds = interval_minutes * 60
        self.health_endpoint = f"{self.url}/health"
        
    def ping(self) -> bool:
        """Ping the app and return True if successful"""
        try:
            response = requests.get(self.health_endpoint, timeout=30)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - "
                      f"App is awake! Status: {data.get('status', 'unknown')}")
                return True
            else:
                print(f"⚠️  {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - "
                      f"Unexpected status code: {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            print(f"❌ {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - "
                  f"Ping failed: {e}")
            return False
    
    def run_forever(self):
        """Keep pinging the app forever"""
        print(f"🚀 Starting keep-alive service for {self.url}")
        print(f"📊 Pinging every {self.interval_seconds // 60} minutes")
        print("🛑 Press Ctrl+C to stop")
        print("-" * 50)
        
        try:
            while True:
                self.ping()
                time.sleep(self.interval_seconds)
        except KeyboardInterrupt:
            print("\n🛑 Keep-alive service stopped")

def main():
    # Configuration
    APP_URL = "https://pietracker.onrender.com"
    PING_INTERVAL_MINUTES = 10  # Adjust as needed
    
    keeper = AppKeepAlive(APP_URL, PING_INTERVAL_MINUTES)
    keeper.run_forever()

if __name__ == "__main__":
    main()