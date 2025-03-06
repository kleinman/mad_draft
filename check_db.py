from app import app
from models import Player, Participant, DraftPick

with app.app_context():
    player_count = Player.query.count()
    participant_count = Participant.query.count()
    draft_pick_count = DraftPick.query.count()
    
    print(f"Number of players: {player_count}")
    print(f"Number of participants: {participant_count}")
    print(f"Number of draft picks: {draft_pick_count}")
    
    if player_count > 0:
        print("\nSample players:")
        for player in Player.query.limit(5).all():
            print(f"  - {player.name} ({player.school}): {player.ppg} PPG, {player.rpg} RPG, {player.apg} APG") 