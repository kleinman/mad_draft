print("Starting app...")
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler
import os
import logging
from datetime import datetime, timedelta

# Import configuration and models
from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS, TOURNAMENT_YEAR
from models import db, Player, Participant, DraftPick, TournamentGame, PlayerTournamentStat
from scraper import update_tournament_data, update_game_scores

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

# Initialize database
db.init_app(app)

# Create scheduler for automatic updates
scheduler = BackgroundScheduler()
scheduler.add_job(update_tournament_data, 'interval', hours=24)
scheduler.add_job(update_game_scores, 'interval', hours=1)  # Update game scores every hour

# Initialize the application before the first request
with app.app_context():
    # Create database tables if they don't exist
    db.create_all()
    
    # Start the scheduler
    if not scheduler.running:
        scheduler.start()

# Add context processor to make 'now' available to all templates
@app.context_processor
def inject_now():
    return {
        'now': datetime.now(),
        'tournament_year': TOURNAMENT_YEAR
    }

@app.before_request
def check_data():
    """Check if we need to perform an initial data scrape before each request"""
    # Only check once
    if not getattr(app, '_data_checked', False):
        player_count = Player.query.count()
        if player_count == 0:
            logger.info("No players found in database. Performing initial data scrape...")
            update_tournament_data()
        app._data_checked = True

@app.route('/')
def index():
    """Homepage route"""
    return render_template('index.html')

@app.route('/players')
def players():
    """Player listing route"""
    # Get sorting parameters
    sort_by = request.args.get('sort', 'name')
    order = request.args.get('order', 'asc')
    
    # Get filter parameters
    position_filter = request.args.get('position')
    school_filter = request.args.get('school')
    region_filter = request.args.get('region')
    
    # Build query
    query = Player.query
    
    # Apply filters
    if position_filter:
        query = query.filter_by(position=position_filter)
    if school_filter:
        query = query.filter_by(school=school_filter)
    if region_filter:
        query = query.filter_by(region=region_filter)
    
    # Apply sorting
    if sort_by == 'name':
        query = query.order_by(Player.name.asc() if order == 'asc' else Player.name.desc())
    elif sort_by == 'ppg':
        query = query.order_by(Player.ppg.desc() if order == 'asc' else Player.ppg.asc())
    elif sort_by == 'rpg':
        query = query.order_by(Player.rpg.desc() if order == 'asc' else Player.rpg.asc())
    elif sort_by == 'apg':
        query = query.order_by(Player.apg.desc() if order == 'asc' else Player.apg.asc())
    elif sort_by == 'seed':
        query = query.order_by(Player.school_seed.asc() if order == 'asc' else Player.school_seed.desc())
    
    # Get all players
    players = query.all()
    
    # Get unique values for filters
    positions = db.session.query(Player.position).distinct().all()
    schools = db.session.query(Player.school).distinct().all()
    regions = db.session.query(Player.region).distinct().all()
    
    return render_template('players.html', 
                          players=players,
                          positions=positions,
                          schools=schools,
                          regions=regions,
                          sort_by=sort_by,
                          order=order)

@app.route('/draft')
def draft():
    """Draft management route"""
    # Get all participants
    participants = Participant.query.all()
    
    # Get all players
    players = Player.query.all()
    
    # Get all draft picks
    draft_picks = DraftPick.query.all()
    
    # Check if we're coming from the players page with a draft_player parameter
    draft_player_id = request.args.get('draft_player')
    draft_player = None
    if draft_player_id:
        draft_player = Player.query.get(draft_player_id)
    
    return render_template('draft.html',
                          participants=participants,
                          players=players,
                          draft_picks=draft_picks,
                          draft_player=draft_player)

@app.route('/participants', methods=['GET', 'POST'])
def participants():
    """Participant management route"""
    if request.method == 'POST':
        # Add new participant
        name = request.form.get('name')
        email = request.form.get('email')
        
        if name:
            participant = Participant(name=name, email=email)
            db.session.add(participant)
            db.session.commit()
        
        return redirect(url_for('participants'))
    
    # Get all participants
    participants = Participant.query.all()
    
    return render_template('participants.html', participants=participants)

@app.route('/leaderboard')
def leaderboard():
    """Leaderboard route"""
    # Get all participants
    participants = Participant.query.all()
    
    # Calculate scores for each participant
    leaderboard_data = []
    for participant in participants:
        score = participant.get_total_score()
        leaderboard_data.append({
            'name': participant.name,
            'score': score,
            'draft_picks': participant.draft_picks
        })
    
    # Sort by score (descending)
    leaderboard_data.sort(key=lambda x: x['score'], reverse=True)
    
    return render_template('leaderboard.html', leaderboard=leaderboard_data)

@app.route('/api/players')
def api_players():
    """API route for getting players"""
    players = Player.query.all()
    
    player_list = []
    for player in players:
        player_list.append({
            'id': player.id,
            'name': player.name,
            'school': player.school,
            'position': player.position,
            'jersey_number': player.jersey_number,
            'year_in_school': player.year_in_school,
            'ppg': player.ppg,
            'rpg': player.rpg,
            'apg': player.apg,
            'school_seed': player.school_seed,
            'region': player.region,
            'is_active': player.is_active
        })
    
    return jsonify(player_list)

@app.route('/api/draft_pick', methods=['POST'])
def api_draft_pick():
    data = request.json
    participant_id = data.get('participant_id')
    player_id = data.get('player_id')
    draft_position = data.get('draft_position')
    
    if not participant_id or not player_id:
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        # Check if player is already drafted
        existing_pick = DraftPick.query.filter_by(player_id=player_id).first()
        if existing_pick:
            return jsonify({'error': 'Player already drafted'}), 400
        
        # Create new draft pick
        draft_pick = DraftPick(
            participant_id=participant_id,
            player_id=player_id,
            draft_position=draft_position
        )
        db.session.add(draft_pick)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/draft_picks/reset', methods=['POST'])
def api_reset_draft_picks():
    try:
        # Delete all draft picks
        DraftPick.query.delete()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'All draft picks have been reset'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/draft_pick/<int:pick_id>', methods=['DELETE'])
def api_delete_draft_pick(pick_id):
    """API route for deleting a draft pick"""
    draft_pick = DraftPick.query.get_or_404(pick_id)
    
    db.session.delete(draft_pick)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/draft_picks', methods=['GET'])
def api_get_draft_picks():
    """API endpoint to get all draft picks"""
    draft_picks = DraftPick.query.all()
    
    picks_data = []
    for pick in draft_picks:
        picks_data.append({
            'id': pick.id,
            'participant_id': pick.participant_id,
            'participant_name': pick.participant.name,
            'player_id': pick.player_id,
            'player_name': pick.player.name,
            'player_school': pick.player.school,
            'player_ppg': pick.player.ppg or '0.0',
            'player_rpg': pick.player.rpg or '0.0',
            'player_apg': pick.player.apg or '0.0',
            'draft_position': pick.draft_position
        })
    
    return jsonify(picks_data)

@app.route('/api/available_players')
def api_available_players():
    """API endpoint to get available players."""
    players = Player.query.all()
    
    # Get all draft picks
    draft_picks = DraftPick.query.all()
    drafted_player_ids = [pick.player_id for pick in draft_picks]
    
    # Separate drafted and undrafted players
    drafted_players = [p for p in players if p.id in drafted_player_ids]
    undrafted_players = [p for p in players if p.id not in drafted_player_ids]
    
    return jsonify({
        'drafted': [player.to_dict() for player in drafted_players],
        'undrafted': [player.to_dict() for player in undrafted_players],
        'all': [player.to_dict() for player in players]
    })

@app.route('/api/update_data', methods=['POST'])
def api_update_data():
    """API route for manually triggering data update"""
    try:
        update_tournament_data()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Error updating data: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/update_game_scores', methods=['POST'])
def api_update_game_scores():
    """API route for manually triggering game scores update"""
    try:
        update_game_scores()
        return jsonify({'success': True, 'message': 'Game scores updated successfully'})
    except Exception as e:
        logger.error(f"Error updating game scores: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/games')
def games():
    """Tournament games listing route"""
    # Get all tournament games
    games = TournamentGame.query.all()
    
    # Get the current tournament year
    tournament_year = TOURNAMENT_YEAR
    
    return render_template('games.html', 
                          games=games,
                          tournament_year=tournament_year)

@app.route('/api/participant/<int:participant_id>', methods=['DELETE'])
def api_delete_participant(participant_id):
    """API route for deleting a participant"""
    try:
        participant = Participant.query.get(participant_id)
        if not participant:
            return jsonify({'error': 'Participant not found'}), 404
        
        # Delete all draft picks associated with this participant
        DraftPick.query.filter_by(participant_id=participant_id).delete()
        
        # Delete the participant
        db.session.delete(participant)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/draft_board')
def api_draft_board():
    try:
        # Get all draft picks with participant and player info
        draft_picks = db.session.query(
            DraftPick, 
            Participant.name.label('participant_name'),
            Player.name.label('player_name'),
            Player.position.label('player_position'),
            Player.team.label('player_team')
        ).join(
            Participant, DraftPick.participant_id == Participant.id
        ).join(
            Player, DraftPick.player_id == Player.id
        ).order_by(
            DraftPick.draft_position
        ).all()
        
        # Format the results
        result = []
        for pick, participant_name, player_name, player_position, player_team in draft_picks:
            result.append({
                'id': pick.id,
                'participant_id': pick.participant_id,
                'participant_name': participant_name,
                'player_id': pick.player_id,
                'player_name': player_name,
                'player_position': player_position,
                'player_team': player_team,
                'draft_position': pick.draft_position
            })
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/game_stats/<int:game_id>')
def api_game_stats(game_id):
    """API endpoint to get game statistics"""
    try:
        # Get the game
        game = TournamentGame.query.get_or_404(game_id)
        
        # Get all player stats for this game
        player_stats = PlayerTournamentStat.query.filter_by(game_id=game.id).all()
        
        # Get all players for team1 and team2
        team1_players = Player.query.filter_by(school=game.team1).all()
        team2_players = Player.query.filter_by(school=game.team2).all()
        
        # Create dictionaries to map player IDs to names
        team1_player_map = {player.id: player.name for player in team1_players}
        team2_player_map = {player.id: player.name for player in team2_players}
        
        # Organize player stats by team
        team1_player_stats = []
        team2_player_stats = []
        
        for stat in player_stats:
            player = Player.query.get(stat.player_id)
            if not player:
                continue
                
            stat_data = {
                'name': player.name,
                'points': stat.points,
                'rebounds': stat.rebounds,
                'assists': stat.assists,
                'steals': stat.steals,
                'blocks': stat.blocks,
                'turnovers': stat.turnovers,
                'minutes_played': stat.minutes_played
            }
            
            if player.school == game.team1:
                team1_player_stats.append(stat_data)
            elif player.school == game.team2:
                team2_player_stats.append(stat_data)
        
        # Return game stats
        return jsonify({
            'id': game.id,
            'round': game.round,
            'game_date': game.game_date,
            'team1': game.team1,
            'team2': game.team2,
            'team1_score': game.team1_score,
            'team2_score': game.team2_score,
            'status': game.status,
            'team1_players': team1_player_stats,
            'team2_players': team2_player_stats
        })
    except Exception as e:
        logger.error(f"Error getting game stats: {e}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors"""
    return render_template('error.html', error_code='404', error_message='Page not found'), 404

@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return render_template('error.html', error_code='500', error_message='Server error'), 500

if __name__ == '__main__':
    # Create data directory if it doesn't exist
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    # App is already initialized
    
    # Run the app
    # Use environment variables for host and port if available
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    app.run(host=host, port=port, debug=debug)
