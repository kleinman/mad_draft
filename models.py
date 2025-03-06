from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    school = db.Column(db.String(100), nullable=False)
    position = db.Column(db.String(20))
    jersey_number = db.Column(db.Integer)
    year_in_school = db.Column(db.String(20))
    ppg = db.Column(db.Float)  # Points per game
    rpg = db.Column(db.Float)  # Rebounds per game
    apg = db.Column(db.Float)  # Assists per game
    school_seed = db.Column(db.Integer)
    region = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)  # Whether player's team is still in tournament
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    draft_picks = db.relationship('DraftPick', backref='player', lazy=True)
    tournament_stats = db.relationship('PlayerTournamentStat', backref='player', lazy=True)
    
    def __repr__(self):
        return f'<Player {self.name} ({self.school})>'
        
    def to_dict(self):
        """Convert player to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'school': self.school,
            'position': self.position,
            'jersey_number': self.jersey_number,
            'year': self.year_in_school,
            'ppg': self.ppg,
            'rpg': self.rpg,
            'apg': self.apg,
            'school_seed': self.school_seed,
            'region': self.region,
            'is_active': self.is_active
        }
    
class Participant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    draft_picks = db.relationship('DraftPick', backref='participant', lazy=True)
    
    def get_total_score(self):
        """Calculate total score from all active draft picks"""
        total = 0
        for pick in self.draft_picks:
            for stat in pick.player.tournament_stats:
                total += stat.points
        return total
    
    def __repr__(self):
        return f'<Participant {self.name}>'

class DraftPick(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('participant.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    draft_position = db.Column(db.Integer)  # Position in the draft order
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DraftPick {self.participant.name} - {self.player.name}>'

class TournamentGame(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_date = db.Column(db.Date, nullable=False)
    round_name = db.Column(db.String(50))  # e.g., "First Round", "Sweet 16"
    team1 = db.Column(db.String(100), nullable=False)
    team2 = db.Column(db.String(100), nullable=False)
    team1_score = db.Column(db.Integer)
    team2_score = db.Column(db.Integer)
    is_completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    player_stats = db.relationship('PlayerTournamentStat', backref='game', lazy=True)
    
    def __repr__(self):
        return f'<Game {self.team1} vs {self.team2} ({self.game_date})>'

class PlayerTournamentStat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('tournament_game.id'), nullable=False)
    points = db.Column(db.Integer, default=0)
    rebounds = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<PlayerStat {self.player.name} - {self.points}pts>'
