import os
from datetime import datetime

# Base directory of the application
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Database configuration
SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'data', 'database.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Scraping configuration
ESPN_BASE_URL = 'https://www.espn.com/mens-college-basketball/'
SCRAPING_INTERVAL_HOURS = 24  # Scrape once per day

# Tournament configuration
CURRENT_YEAR = datetime.now().year
# Updated to use 2025 data
TOURNAMENT_YEAR = 2025
