// Test script for loadAvailablePlayers function

// Create a mock container
document.body.innerHTML += `
<div id="test-container">
    <div id="available-players-container">
        <div class="text-center w-100 py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading players...</p>
        </div>
    </div>
    <select id="available-status-filter">
        <option value="undrafted" selected>Undrafted</option>
        <option value="drafted">Drafted</option>
        <option value="all">All Players</option>
    </select>
</div>
`;

// Simple test function
async function testLoadPlayers() {
    console.log('Testing loadAvailablePlayers function');
    
    try {
        // Fetch players directly
        const response = await fetch('/api/available_players');
        if (!response.ok) {
            throw new Error('Failed to fetch players');
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        // Get the container
        const container = document.getElementById('available-players-container');
        if (!container) {
            console.error('Container not found');
            return;
        }
        
        // Get the filter
        const filter = document.getElementById('available-status-filter');
        const filterValue = filter ? filter.value : 'undrafted';
        
        // Get the appropriate players
        let players = [];
        if (filterValue === 'all') {
            players = data.all;
        } else if (filterValue === 'drafted') {
            players = data.drafted;
        } else {
            players = data.undrafted;
        }
        
        console.log('Filtered players:', players.length);
        
        // Clear the container
        container.innerHTML = '';
        
        if (players.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted">No players found.</p>
                </div>
            `;
            return;
        }
        
        // Add each player to the container
        players.forEach(player => {
            const playerCard = document.createElement('div');
            playerCard.className = 'col';
            playerCard.innerHTML = `
                <div class="card h-100 player-card">
                    <div class="card-body">
                        <h5 class="card-title">${player.name}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${player.school}</h6>
                        <p>PPG: ${player.ppg}, RPG: ${player.rpg}, APG: ${player.apg}</p>
                    </div>
                </div>
            `;
            container.appendChild(playerCard);
        });
        
        console.log('Players added to container:', players.length);
    } catch (error) {
        console.error('Error testing loadPlayers:', error);
    }
}

// Run the test
document.addEventListener('DOMContentLoaded', function() {
    console.log('Test script loaded');
    testLoadPlayers();
}); 