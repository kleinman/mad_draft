import requests
from bs4 import BeautifulSoup
import logging
import time
import json
import os
from datetime import datetime, timedelta
from models import db, Player, TournamentGame, PlayerTournamentStat
from config import TOURNAMENT_YEAR, ESPN_BASE_URL


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MarchMadnessScraper:
    """
    Provides capabilities to scrape and manage data related to the NCAA March Madness tournament.

    This class supports methods to scrape tournament teams, team rosters, and player statistics.
    Implementations include caching the data locally in JSON files to minimize redundant
    network requests. It also interacts with web pages using the Beautiful Soup library to
    parse HTML content, and provides options for customizing requests such as forcing fresh
    scrapes instead of using cached data.

    Attributes:
        base_url: Base API or website URL for accessing NCAA or ESPN-related data.
        headers: HTTP headers used for making requests, including a User-Agent string to
                 minimize bot detection issues.
        data_dir: Directory location where cached JSON data is stored.
    """
    def __init__(self, base_url=ESPN_BASE_URL):
        self.base_url = base_url
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        self.data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir)
    
    def save_data(self, data, filename):
        """Save data to a JSON file"""
        filepath = os.path.join(self.data_dir, filename)
        try:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"Data saved to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Error saving data to {filepath}: {e}")
            return False
    
    def load_data(self, filename):
        """Load data from a JSON file"""
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            logger.info(f"No cached data found at {filepath}")
            return None
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            logger.info(f"Data loaded from {filepath}")
            return data
        except Exception as e:
            logger.error(f"Error loading data from {filepath}: {e}")
            return None
            
    def get_page(self, url):
        """Fetch a web page and return the BeautifulSoup object"""
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None
    
    def scrape_tournament_teams(self, year=TOURNAMENT_YEAR, force_refresh=False):
        """Scrape all teams participating in the tournament for a given year"""
        cache_filename = f"tournament_teams_{year}.json"
        
        # Try to load from cache first if not forcing refresh
        if not force_refresh:
            cached_data = self.load_data(cache_filename)
            if cached_data:
                logger.info(f"Using cached tournament teams data for {year}")
                return cached_data
        
        logger.info(f"Scraping tournament teams for {year}")
        
        # This URL would need to be adjusted based on ESPN's actual URL structure
        url = f"{self.base_url}tournament/bracket/_/year/{year}"
        soup = self.get_page(url)
        
        if not soup:
            return []
        
        # For demonstration purposes, return sample data
        # In a real implementation, you would parse the HTML to extract team information
        sample_teams = [
            {'name': 'Gonzaga', 'seed': 1, 'region': 'West'},
            {'name': 'Baylor', 'seed': 1, 'region': 'South'},
            {'name': 'Illinois', 'seed': 1, 'region': 'Midwest'},
            {'name': 'Michigan', 'seed': 1, 'region': 'East'},
            {'name': 'Iowa', 'seed': 2, 'region': 'West'},
            {'name': 'Ohio State', 'seed': 2, 'region': 'South'},
            {'name': 'Houston', 'seed': 2, 'region': 'Midwest'},
            {'name': 'Alabama', 'seed': 2, 'region': 'East'},
            # Add more teams as needed
        ]
        
        # Save to cache
        self.save_data(sample_teams, cache_filename)
        
        logger.info(f"Found {len(sample_teams)} tournament teams")
        return sample_teams
    
    def scrape_team_players(self, team_name, year=TOURNAMENT_YEAR, force_refresh=False):
        """Scrape all players from a specific team"""
        cache_filename = f"team_players_{team_name}_{year}.json"
        
        # Try to load from cache first if not forcing refresh
        if not force_refresh:
            cached_data = self.load_data(cache_filename)
            if cached_data:
                logger.info(f"Using cached player data for {team_name} ({year})")
                return cached_data
        
        logger.info(f"Scraping players for {team_name} ({year})")
        
        # This URL would need to be adjusted based on ESPN's actual URL structure
        url = f"{self.base_url}team/roster/_/id/{team_name}/year/{year}"
        soup = self.get_page(url)
        
        if not soup:
            return []
        
        # For demonstration purposes, return sample data
        # In a real implementation, you would parse the HTML to extract player information
        if team_name == 'Gonzaga':
            sample_players = [
                {'name': 'Drew Timme', 'position': 'F', 'jersey_number': 2, 'year_in_school': 'Junior', 'school': 'Gonzaga'},
                {'name': 'Jalen Suggs', 'position': 'G', 'jersey_number': 1, 'year_in_school': 'Freshman', 'school': 'Gonzaga'},
                {'name': 'Corey Kispert', 'position': 'F', 'jersey_number': 24, 'year_in_school': 'Senior', 'school': 'Gonzaga'},
                # Add more players as needed
            ]
        elif team_name == 'Baylor':
            sample_players = [
                {'name': 'Jared Butler', 'position': 'G', 'jersey_number': 12, 'year_in_school': 'Junior', 'school': 'Baylor'},
                {'name': 'Davion Mitchell', 'position': 'G', 'jersey_number': 45, 'year_in_school': 'Junior', 'school': 'Baylor'},
                {'name': 'MaCio Teague', 'position': 'G', 'jersey_number': 31, 'year_in_school': 'Senior', 'school': 'Baylor'},
                # Add more players as needed
            ]
        else:
            # Generate some sample players for other teams
            sample_players = [
                {'name': f'Player 1 ({team_name})', 'position': 'G', 'jersey_number': 1, 'year_in_school': 'Freshman', 'school': team_name},
                {'name': f'Player 2 ({team_name})', 'position': 'F', 'jersey_number': 2, 'year_in_school': 'Sophomore', 'school': team_name},
                {'name': f'Player 3 ({team_name})', 'position': 'C', 'jersey_number': 3, 'year_in_school': 'Junior', 'school': team_name},
                # Add more players as needed
            ]
        
        # Save to cache
        self.save_data(sample_players, cache_filename)
        
        logger.info(f"Found {len(sample_players)} players for {team_name}")
        return sample_players
    
    def scrape_player_stats(self, player_name, team_name, year=TOURNAMENT_YEAR, force_refresh=False):
        """Scrape statistics for a specific player"""
        # Create a safe filename by replacing spaces and special characters
        safe_player_name = player_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        cache_filename = f"player_stats_{safe_player_name}_{team_name}_{year}.json"
        
        # Try to load from cache first if not forcing refresh
        if not force_refresh:
            cached_data = self.load_data(cache_filename)
            if cached_data:
                logger.info(f"Using cached stats for {player_name} ({team_name}, {year})")
                return cached_data
        
        logger.info(f"Scraping stats for {player_name} ({team_name}, {year})")
        
        # This URL would need to be adjusted based on ESPN's actual URL structure
        url = f"{self.base_url}player/stats/_/id/{player_name}/team/{team_name}/year/{year}"
        soup = self.get_page(url)
        
        if not soup:
            return {}
        
        # For demonstration purposes, return sample data
        # In a real implementation, you would parse the HTML to extract player statistics
        import random
        
        # Generate random stats for demonstration
        sample_stats = {
            'ppg': round(random.uniform(5.0, 25.0), 1),  # Points per game
            'rpg': round(random.uniform(1.0, 12.0), 1),  # Rebounds per game
            'apg': round(random.uniform(0.5, 8.0), 1),   # Assists per game
        }
        
        # Save to cache
        self.save_data(sample_stats, cache_filename)
        
        logger.info(f"Scraped stats for {player_name}: {sample_stats}")
        return sample_stats
    
    def scrape_tournament_games(self, year=TOURNAMENT_YEAR, force_refresh=False):
        """Scrape all tournament games and their results"""
        cache_filename = f"tournament_games_{year}.json"
        
        # Try to load from cache first if not forcing refresh
        if not force_refresh:
            cached_data = self.load_data(cache_filename)
            if cached_data:
                logger.info(f"Using cached tournament games data for {year}")
                return cached_data
        
        logger.info(f"Scraping tournament games for {year}")
        
        # This URL would need to be adjusted based on ESPN's actual URL structure
        url = f"{self.base_url}tournament/bracket/_/year/{year}"
        soup = self.get_page(url)
        
        if not soup:
            return []
        
        # For demonstration purposes, return sample data
        # In a real implementation, you would parse the HTML to extract game information
        sample_games = [
            {
                'game_id': 1,
                'round': 1,
                'game_date': datetime.now().strftime('%Y-%m-%d'),
                'team1': 'Gonzaga',
                'team2': 'Norfolk State',
                'team1_score': 98,
                'team2_score': 55,
                'status': 'completed'
            },
            {
                'game_id': 2,
                'round': 1,
                'game_date': datetime.now().strftime('%Y-%m-%d'),
                'team1': 'Baylor',
                'team2': 'Hartford',
                'team1_score': 79,
                'team2_score': 55,
                'status': 'completed'
            },
            {
                'game_id': 3,
                'round': 1,
                'game_date': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
                'team1': 'Michigan',
                'team2': 'Texas Southern',
                'team1_score': None,
                'team2_score': None,
                'status': 'scheduled'
            }
        ]
        
        # Save to cache
        self.save_data(sample_games, cache_filename)
        
        logger.info(f"Found {len(sample_games)} tournament games")
        return sample_games
    
    def scrape_player_game_stats(self, player_name, team_name, game_id, year=TOURNAMENT_YEAR, force_refresh=False):
        """Scrape player statistics for a specific game"""
        # Create a safe filename by replacing spaces and special characters
        safe_player_name = player_name.replace(' ', '_').replace('/', '_').replace('\\', '_')
        cache_filename = f"player_game_stats_{safe_player_name}_{team_name}_game{game_id}_{year}.json"
        
        # Try to load from cache first if not forcing refresh
        if not force_refresh:
            cached_data = self.load_data(cache_filename)
            if cached_data:
                logger.info(f"Using cached game stats for {player_name} ({team_name}, game {game_id}, {year})")
                return cached_data
        
        logger.info(f"Scraping game stats for {player_name} ({team_name}, game {game_id}, {year})")
        
        # This URL would need to be adjusted based on ESPN's actual URL structure
        url = f"{self.base_url}boxscore/_/gameId/{game_id}/year/{year}"
        soup = self.get_page(url)
        
        if not soup:
            return {}
        
        # For demonstration purposes, return sample data
        # In a real implementation, you would parse the HTML to extract player game statistics
        import random
        
        # Generate random stats for demonstration
        sample_game_stats = {
            'points': random.randint(0, 30),
            'rebounds': random.randint(0, 15),
            'assists': random.randint(0, 10),
            'steals': random.randint(0, 5),
            'blocks': random.randint(0, 5),
            'turnovers': random.randint(0, 5),
            'minutes_played': random.randint(10, 40)
        }
        
        # Save to cache
        self.save_data(sample_game_stats, cache_filename)
        
        logger.info(f"Scraped game stats for {player_name} (game {game_id}): {sample_game_stats}")
        return sample_game_stats
    
    def update_database(self):
        """Update the database with the latest tournament data"""
        logger.info("Starting database update")
        
        # Get current year or use configured tournament year
        year = TOURNAMENT_YEAR
        
        # Step 1: Get all tournament teams
        teams = self.scrape_tournament_teams(year)
        
        # Step 2: For each team, get all players and their stats
        for team in teams:
            players = self.scrape_team_players(team['name'], year)
            
            for player_data in players:
                # Add team info to player data
                player_data['school_seed'] = team['seed']
                player_data['region'] = team['region']
                
                # Get player stats
                stats = self.scrape_player_stats(player_data['name'], team['name'], year)
                player_data.update(stats)
                
                # Check if player already exists in database
                player = Player.query.filter_by(
                    name=player_data['name'],
                    school=player_data['school']
                ).first()
                
                if player:
                    # Update existing player
                    for key, value in player_data.items():
                        setattr(player, key, value)
                else:
                    # Create new player
                    player = Player(**player_data)
                    db.session.add(player)
            
            # Commit changes for this team
            db.session.commit()
        
        # Step 3: Get all tournament games
        games = self.scrape_tournament_games(year)
        
        # Step 4: Update or create tournament games in the database
        for game_data in games:
            # Check if game already exists in database
            game = TournamentGame.query.filter_by(
                game_id=game_data['game_id'],
                team1=game_data['team1'],
                team2=game_data['team2']
            ).first()
            
            if game:
                # Update existing game
                for key, value in game_data.items():
                    setattr(game, key, value)
            else:
                # Create new game
                game = TournamentGame(**game_data)
                db.session.add(game)
            
            # Commit changes for this game
            db.session.commit()
            
            # If the game is completed, update player stats
            if game_data['status'] == 'completed':
                self.update_player_game_stats(game_data, year)
        
        logger.info("Database update completed")
    
    def update_player_game_stats(self, game_data, year=TOURNAMENT_YEAR):
        """Update player statistics for a specific game"""
        logger.info(f"Updating player stats for game {game_data['game_id']}")
        
        # Get all players from both teams
        team1_players = self.scrape_team_players(game_data['team1'], year)
        team2_players = self.scrape_team_players(game_data['team2'], year)
        
        # Get the game from the database
        game = TournamentGame.query.filter_by(game_id=game_data['game_id']).first()
        if not game:
            logger.error(f"Game {game_data['game_id']} not found in database")
            return
        
        # Update stats for team 1 players
        for player_data in team1_players:
            self.update_player_stats_for_game(player_data, game_data['team1'], game, year)
        
        # Update stats for team 2 players
        for player_data in team2_players:
            self.update_player_stats_for_game(player_data, game_data['team2'], game, year)
        
        logger.info(f"Player stats updated for game {game_data['game_id']}")
    
    def update_player_stats_for_game(self, player_data, team_name, game, year=TOURNAMENT_YEAR):
        """Update statistics for a specific player in a specific game"""
        player_name = player_data['name']
        
        # Get player from database
        player = Player.query.filter_by(
            name=player_name,
            school=team_name
        ).first()
        
        if not player:
            logger.error(f"Player {player_name} ({team_name}) not found in database")
            return
        
        # Get player game stats
        game_stats = self.scrape_player_game_stats(player_name, team_name, game.game_id, year)
        
        # Check if player stats for this game already exist
        player_game_stats = PlayerTournamentStat.query.filter_by(
            player_id=player.id,
            game_id=game.id
        ).first()
        
        if player_game_stats:
            # Update existing stats
            for key, value in game_stats.items():
                setattr(player_game_stats, key, value)
        else:
            # Create new stats
            player_game_stats = PlayerTournamentStat(
                player_id=player.id,
                game_id=game.id,
                **game_stats
            )
            db.session.add(player_game_stats)
        
        # Commit changes
        db.session.commit()
        
        logger.info(f"Updated game stats for {player_name} (game {game.game_id})")

# Function to initialize scraper and update database
def update_tournament_data():
    scraper = MarchMadnessScraper()
    scraper.update_database()

# Function to update game scores and player statistics
def update_game_scores():
    logger.info("Starting game scores update")
    scraper = MarchMadnessScraper()
    
    # Get all tournament games
    games = scraper.scrape_tournament_games(TOURNAMENT_YEAR, force_refresh=True)
    
    # Update games and player stats
    for game_data in games:
        # Check if game is completed
        if game_data['status'] == 'completed':
            # Update player stats for this game
            scraper.update_player_game_stats(game_data, TOURNAMENT_YEAR)
    
    logger.info("Game scores update completed")
