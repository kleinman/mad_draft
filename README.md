# March Madness Fantasy Draft App

A web application for managing a fantasy draft for the NCAA March Madness basketball tournament.

## Features

- Player data scraping from sports websites
- Draft management interface
- Player allocation to participants
- Automatic scoring based on tournament performance
- Leaderboard display

## Setup Instructions

1. Clone this repository
2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Run the application:
   ```
   python app.py
   ```
4. Access the web interface at http://localhost:5000

## Deployment Instructions

### Deploying to Render (Recommended)

1. Create a free account on [Render](https://render.com/)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Use the following settings:
   - Name: march-madness-fantasy-draft (or your preferred name)
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
5. Click "Create Web Service"

### Deploying to Heroku

1. Create a free account on [Heroku](https://heroku.com/)
2. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
3. Login to Heroku: `heroku login`
4. Create a new app: `heroku create your-app-name`
5. Push your code: `git push heroku main`
6. Open your app: `heroku open`

### Deploying to PythonAnywhere

1. Create a free account on [PythonAnywhere](https://www.pythonanywhere.com/)
2. Go to the Web tab and create a new web app
3. Select Flask and Python 3.9
4. Clone your repository: `git clone https://github.com/yourusername/your-repo.git`
5. Set up a virtual environment and install requirements
6. Configure the WSGI file to point to your app

## Project Structure

- `app.py`: Main application entry point
- `scraper.py`: Data scraping functionality
- `models.py`: Database models
- `static/`: CSS, JavaScript, and other static files
- `templates/`: HTML templates
- `data/`: Database and cached data

## Technologies Used

- Backend: Python, Flask
- Frontend: HTML, CSS, JavaScript, Bootstrap
- Database: SQLite
- Data Scraping: BeautifulSoup, Requests

## License

MIT
