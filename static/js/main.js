// Main JavaScript file for March Madness Fantasy Draft App

// Helper function to show alerts
function showAlert(message, type = 'info') {
    // Check if the alert container exists, if not create it
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '9999';
        document.body.appendChild(alertContainer);
    }
    
    // Create the alert element
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show`;
    alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add the alert to the container
    alertContainer.appendChild(alertEl);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alertEl.classList.remove('show');
        setTimeout(() => alertEl.remove(), 300);
    }, 5000);
}

// Global variable declarations for access across functions
let availableStatusFilter;
let refreshPlayersBtn;
let availablePlayersContainer;

// Global variables for draft functionality
let isDraftModeActive = false;
let currentDraftRound = 1;
let currentDrafterIndex = 0;
let draftOrder = [];
let draftType = 'snake';
let draftDirection = 'forward';
let pausedDraftState = null; // Store the draft state when paused
let autodraftParticipants = {}; // Track which participants have autodraft enabled

// Function to initialize draft buttons
function initializeDraftButtons() {
    console.log('initializeDraftButtons called');
    const draftButtons = document.querySelectorAll('.draft-player-btn');
    console.log('Found draft buttons:', draftButtons.length);
    
    draftButtons.forEach(button => {
        // Remove existing event listeners to prevent duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const playerId = this.dataset.playerId;
            const playerName = this.dataset.playerName;
            
            // Get the selected participant
            const participantSelect = document.getElementById('participant-select');
            if (!participantSelect || !participantSelect.value) {
                showAlert('Please select a participant before drafting a player.', 'warning');
                return;
            }
            
            const participantId = participantSelect.value;
            const participantName = participantSelect.options[participantSelect.selectedIndex].text;
            
            // Get the current draft position
            const draftPositionInput = document.getElementById('draft-position');
            const draftPosition = draftPositionInput ? draftPositionInput.value : null;
            
            console.log('Drafting player:', playerName, 'for participant:', participantName);
            console.log('Draft mode active:', isDraftModeActive);
            
            // Send draft pick to server
            fetch('/api/draft_pick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    player_id: playerId,
                    draft_position: draftPosition
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to draft player');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    showAlert(`Error: ${data.error}`, 'danger');
                } else {
                    // Mark player as drafted
                    this.disabled = true;
                    this.className = 'btn btn-sm btn-secondary w-100';
                    this.innerHTML = '<i class="fas fa-check me-1"></i> Drafted';
                    
                    // Increment draft position
                    if (draftPositionInput) {
                        draftPositionInput.value = parseInt(draftPositionInput.value) + 1;
                    }
                    
                    // Show success message
                    showAlert(`${playerName} drafted by ${participantName}!`, 'success');
                    
                    // If draft mode is active, advance to next drafter
                    if (isDraftModeActive) {
                        console.log('Draft mode is active, advancing to next drafter');
                        setTimeout(() => {
                            advanceToNextDrafter();
                        }, 1000); // Delay to allow the success message to be seen
                    } else {
                        console.log('Draft mode is not active, not advancing');
                    }
                    
                    // Update draft board and reload players
                    setTimeout(() => {
                        updateDraftBoard();
                        loadAvailablePlayers();
                    }, 500);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert(`Error: ${error.message || 'An error occurred while drafting the player.'}`, 'danger');
            });
        });
    });
}

// Function to load available players
function loadAvailablePlayers() {
    console.log('loadAvailablePlayers called');
    
    // Debug: Check if we're on the draft page
    const isDraftPage = window.location.pathname.includes('/draft');
    console.log('Is draft page:', isDraftPage);
    if (!isDraftPage) {
        console.log('Not on draft page, returning');
        return;
    }
    
    if (!availablePlayersContainer) {
        availablePlayersContainer = document.getElementById('available-players-container');
        console.log('availablePlayersContainer initialized:', availablePlayersContainer);
    }
    if (!availableStatusFilter) {
        availableStatusFilter = document.getElementById('available-status-filter');
        console.log('availableStatusFilter initialized:', availableStatusFilter);
    }
    
    if (!availablePlayersContainer) {
        console.error('ERROR: No availablePlayersContainer found, returning');
        // Try to find the container by different means
        const containers = document.querySelectorAll('[id]');
        console.log('All containers with IDs:', Array.from(containers).map(c => c.id));
        return;
    }
    
    // Show loading indicator
    availablePlayersContainer.innerHTML = `
        <div class="text-center w-100 py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">Loading players...</p>
        </div>
    `;
    console.log('Loading indicator displayed');
    
    // Fetch players from the server
    console.log('Fetching from /api/available_players');
    fetch('/api/available_players')
        .then(response => {
            console.log('Response received:', response);
            if (!response.ok) {
                throw new Error('Failed to fetch players');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data received:', data);
            // Get the selected filter value
            const filterValue = availableStatusFilter ? availableStatusFilter.value : 'undrafted';
            console.log('Filter value:', filterValue);
            
            // Get the appropriate players based on the filter
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
            availablePlayersContainer.innerHTML = '';
            
            if (players.length === 0) {
                availablePlayersContainer.innerHTML = `
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
                
                // Determine region badge color
                let regionBadgeClass = 'bg-info';
                if (player.region === 'West') {
                    regionBadgeClass = 'bg-danger';
                } else if (player.region === 'East') {
                    regionBadgeClass = 'bg-success';
                } else if (player.region === 'South') {
                    regionBadgeClass = 'bg-warning text-dark';
                } else if (player.region === 'Midwest') {
                    regionBadgeClass = 'bg-primary';
                }
                
                playerCard.innerHTML = `
                    <div class="card h-100 player-card ${filterValue === 'drafted' ? 'drafted' : ''}">
                        <div class="card-body">
                            <h5 class="card-title player-name">${player.name}</h5>
                            <h6 class="card-subtitle mb-2 text-muted">
                                <span class="player-seed">${player.school_seed}</span>
                                <span class="player-school">${player.school}</span>
                                <span class="ms-2 badge ${regionBadgeClass}">${player.region}</span>
                            </h6>
                            <p class="card-text">
                                <span class="badge bg-light text-dark">${player.position || 'N/A'}</span>
                                <span class="ms-2">${player.year || 'N/A'}</span>
                            </p>
                            <div class="player-stats">
                                <div class="row text-center">
                                    <div class="col">
                                        <div class="stat-value">${player.ppg || '0.0'}</div>
                                        <div class="stat-label">PPG</div>
                                    </div>
                                    <div class="col">
                                        <div class="stat-value">${player.rpg || '0.0'}</div>
                                        <div class="stat-label">RPG</div>
                                    </div>
                                    <div class="col">
                                        <div class="stat-value">${player.apg || '0.0'}</div>
                                        <div class="stat-label">APG</div>
                                    </div>
                                </div>
                            </div>
                            ${filterValue !== 'drafted' ? `
                            <div class="mt-3">
                                <button class="btn btn-sm btn-primary w-100 draft-player-btn" 
                                        data-player-id="${player.id}" 
                                        data-player-name="${player.name}">
                                    <i class="fas fa-plus-circle me-1"></i> Draft Player
                                </button>
                            </div>
                            ` : `
                            <div class="mt-3">
                                <button class="btn btn-sm btn-secondary w-100" disabled>
                                    <i class="fas fa-check me-1"></i> Drafted
                                </button>
                            </div>
                            `}
                        </div>
                    </div>
                `;
                
                availablePlayersContainer.appendChild(playerCard);
            });
            
            console.log('Players added to container:', players.length);
            
            // Initialize draft buttons
            initializeDraftButtons();
        })
        .catch(error => {
            console.error('Error loading players:', error);
            availablePlayersContainer.innerHTML = `
                <div class="col-12 text-center py-4">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Error loading players: ${error.message}
                    </div>
                    <button id="retry-load-players" class="btn btn-primary mt-3">
                        <i class="fas fa-sync-alt me-2"></i> Retry
                    </button>
                </div>
            `;
            
            // Add retry button functionality
            const retryButton = document.getElementById('retry-load-players');
            if (retryButton) {
                retryButton.addEventListener('click', loadAvailablePlayers);
            }
        });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize sortable tables
    initSortableTables();
    
    // Initialize player search
    initPlayerSearch();
    
    // Initialize draft functionality
    initDraftFunctionality();
});

// Function to initialize sortable tables
function initSortableTables() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            const currentOrder = this.dataset.order || 'asc';
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            
            // Update URL with new sort parameters
            const url = new URL(window.location);
            url.searchParams.set('sort', sortBy);
            url.searchParams.set('order', newOrder);
            window.location.href = url.toString();
        });
    });
}

// Function to initialize player search
function initPlayerSearch() {
    const searchInput = document.getElementById('player-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const playerCards = document.querySelectorAll('.player-card');
        
        playerCards.forEach(card => {
            const playerName = card.querySelector('.player-name').textContent.toLowerCase();
            const playerSchool = card.querySelector('.player-school').textContent.toLowerCase();
            
            if (playerName.includes(searchTerm) || playerSchool.includes(searchTerm)) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Function to initialize draft functionality
function initDraftFunctionality() {
    // Load draft state from localStorage if it exists
    loadDraftStateFromStorage();
    
    // Initialize autodraft functionality
    const participantSelect = document.getElementById('participant-select');
    const autodraftCheckbox = document.getElementById('autodraft-checkbox');
    
    if (participantSelect && autodraftCheckbox) {
        // Update checkbox state when participant changes
        participantSelect.addEventListener('change', function() {
            const participantId = this.value;
            if (participantId) {
                // Update checkbox based on stored autodraft setting
                autodraftCheckbox.checked = autodraftParticipants[participantId] || false;
            } else {
                autodraftCheckbox.checked = false;
            }
        });
        
        // Update autodraft setting when checkbox changes
        autodraftCheckbox.addEventListener('change', function() {
            const participantId = participantSelect.value;
            if (participantId) {
                autodraftParticipants[participantId] = this.checked;
                console.log(`Autodraft for participant ${participantId} set to ${this.checked}`);
                
                // Save to localStorage
                saveDraftStateToStorage();
                
                if (this.checked) {
                    showAlert(`Autodraft enabled for ${participantSelect.options[participantSelect.selectedIndex].text}`, 'info');
                } else {
                    showAlert(`Autodraft disabled for ${participantSelect.options[participantSelect.selectedIndex].text}`, 'info');
                }
            }
        });
    }
    
    // Initialize player filter on draft page
    const playerFilter = document.getElementById('player-filter');
    const applyPlayerFilterBtn = document.getElementById('apply-player-filter');
    
    if (playerFilter && applyPlayerFilterBtn) {
        applyPlayerFilterBtn.addEventListener('click', function() {
            const participantId = playerFilter.value;
            const draftRows = document.querySelectorAll('.draft-pick');
            
            draftRows.forEach(row => {
                if (participantId === 'all') {
                    row.style.display = '';
                } else {
                    const participantCell = row.querySelector('td:nth-child(2)');
                    const participantName = participantCell.textContent.trim();
                    const participantOption = playerFilter.querySelector(`option[value="${participantId}"]`);
                    
                    if (participantOption && participantName === participantOption.textContent.trim()) {
                        row.style.display = '';
                    } else {
                        row.style.display = 'none';
                    }
                }
            });
        });
    }
    
    // Initialize available players section
    availableStatusFilter = document.getElementById('available-status-filter');
    refreshPlayersBtn = document.getElementById('refresh-players-btn');
    availablePlayersContainer = document.getElementById('available-players-container');
    
    if (availableStatusFilter && availablePlayersContainer) {
        // Load players initially
        loadAvailablePlayers();
        
        // Add event listener for filter change
        availableStatusFilter.addEventListener('change', function() {
            loadAvailablePlayers();
        });
        
        // Add event listener for refresh button
        if (refreshPlayersBtn) {
            refreshPlayersBtn.addEventListener('click', function() {
                loadAvailablePlayers();
            });
        }
    }
    
    // Initialize draft order functionality
    initDraftOrderControls();
    
    // Initialize start draft button
    initStartDraftButton();
    
    // Initialize reset draft button
    initResetDraftButton();
    
    const draftButtons = document.querySelectorAll('.draft-player-btn');
    if (draftButtons.length === 0) return;
    
    draftButtons.forEach(button => {
        button.addEventListener('click', function() {
            const playerId = this.dataset.playerId;
            const playerName = this.dataset.playerName;
            // Check if we're on the players page or the draft page
            const participantSelect = document.getElementById('participant-select');
            
            if (!participantSelect) {
                // If we're on the players page, redirect to the draft page with the player ID
                window.location.href = `/draft?draft_player=${playerId}`;
                return;
            }
            
            const participantId = participantSelect.value;
            
            if (!participantId || participantId === '') {
                alert('Please select a participant first!');
                return;
            }
            
            const participantName = participantSelect.options[participantSelect.selectedIndex].text;
            
            // Get the current draft position
            const draftPositionInput = document.getElementById('draft-position');
            const draftPosition = draftPositionInput ? draftPositionInput.value : null;
            
            console.log('Drafting player:', playerName, 'for participant:', participantName);
            console.log('Draft mode active:', isDraftModeActive);
            
            // Send draft pick to server
            fetch('/api/draft_pick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    player_id: playerId,
                    draft_position: draftPosition
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to draft player');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    showAlert(`Error: ${data.error}`, 'danger');
                } else {
                    // Mark player as drafted
                    this.disabled = true;
                    this.className = 'btn btn-sm btn-secondary w-100';
                    this.innerHTML = '<i class="fas fa-check me-1"></i> Drafted';
                    
                    // Increment draft position
                    if (draftPositionInput) {
                        draftPositionInput.value = parseInt(draftPositionInput.value) + 1;
                    }
                    
                    // Show success message
                    showAlert(`${playerName} drafted by ${participantName}!`, 'success');
                    
                    // If draft mode is active, advance to next drafter
                    if (isDraftModeActive) {
                        console.log('Draft mode is active, advancing to next drafter');
                        setTimeout(() => {
                            advanceToNextDrafter();
                        }, 1000); // Delay to allow the success message to be seen
                    } else {
                        console.log('Draft mode is not active, not advancing');
                    }
                    
                    // Update draft board and reload players
                    setTimeout(() => {
                        updateDraftBoard();
                        loadAvailablePlayers();
                    }, 500);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert(`Error: ${error.message || 'An error occurred while drafting the player.'}`, 'danger');
            });
        });
    });
    
    // Initialize remove draft pick functionality
    initializeRemoveDraftButtons();
}

// Function to initialize draft order controls
function initDraftOrderControls() {
    console.log('Initializing draft order controls');
    const draftOrderList = document.getElementById('draft-order-list');
    if (!draftOrderList) {
        console.log('No draft order list found');
        return;
    }
    
    console.log('Found draft order list');
    
    // Get all move up buttons
    const moveUpButtons = document.querySelectorAll('.move-up-btn');
    console.log('Found move up buttons:', moveUpButtons.length);
    
    moveUpButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Move up button clicked');
            e.preventDefault();
            const listItem = this.closest('li');
            const prevListItem = listItem.previousElementSibling;
            
            if (prevListItem) {
                // Swap the list items
                draftOrderList.insertBefore(listItem, prevListItem);
                
                // Update button states
                updateMoveButtonStates();
                
                console.log('Moved item up');
            }
        });
    });
    
    // Get all move down buttons
    const moveDownButtons = document.querySelectorAll('.move-down-btn');
    console.log('Found move down buttons:', moveDownButtons.length);
    
    moveDownButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            console.log('Move down button clicked');
            e.preventDefault();
            const listItem = this.closest('li');
            const nextListItem = listItem.nextElementSibling;
            
            if (nextListItem) {
                // Swap the list items
                draftOrderList.insertBefore(nextListItem, listItem);
                
                // Update button states
                updateMoveButtonStates();
                
                console.log('Moved item down');
            }
        });
    });
    
    // Randomize order button
    const randomizeButton = document.getElementById('randomize-order-btn');
    if (randomizeButton) {
        randomizeButton.addEventListener('click', function(e) {
            console.log('Randomize button clicked');
            e.preventDefault();
            
            // Get all list items
            const listItems = Array.from(draftOrderList.querySelectorAll('li'));
            console.log('Found list items:', listItems.length);
            
            // Shuffle the list items
            for (let i = listItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [listItems[i], listItems[j]] = [listItems[j], listItems[i]];
            }
            
            // Clear the list
            while (draftOrderList.firstChild) {
                draftOrderList.removeChild(draftOrderList.firstChild);
            }
            
            // Reappend the list items in the new order
            listItems.forEach(item => {
                draftOrderList.appendChild(item);
            });
            
            // Update button states
            updateMoveButtonStates();
            
            // Show success message
            showAlert('Draft order randomized!', 'success');
            console.log('Draft order randomized');
        });
    }
}

// Function to update move button states
function updateMoveButtonStates() {
    const draftOrderList = document.getElementById('draft-order-list');
    if (!draftOrderList) return;
    
    const listItems = draftOrderList.querySelectorAll('li');
    console.log('Updating button states for', listItems.length, 'items');
    
    listItems.forEach((item, index) => {
        const moveUpBtn = item.querySelector('.move-up-btn');
        const moveDownBtn = item.querySelector('.move-down-btn');
        
        if (moveUpBtn) {
            moveUpBtn.disabled = index === 0;
            console.log('Move up button disabled:', index === 0);
        }
        
        if (moveDownBtn) {
            moveDownBtn.disabled = index === listItems.length - 1;
            console.log('Move down button disabled:', index === listItems.length - 1);
        }
    });
}

// Function to initialize start draft button
function initStartDraftButton() {
    const startDraftBtn = document.getElementById('start-draft-btn');
    const stopDraftBtn = document.getElementById('stop-draft-btn');
    const resumeDraftBtn = document.getElementById('resume-draft-btn');
    const draftStatus = document.getElementById('draft-status');
    
    if (!startDraftBtn) {
        console.log('No start draft button found');
        return;
    }
    
    console.log('Found start draft button');
    
    // Get participant select
    const participantSelect = document.getElementById('participant-select');
    
    startDraftBtn.addEventListener('click', function(e) {
        console.log('Start draft button clicked');
        e.preventDefault();
        
        // Get the draft type
        const snakeDraftRadio = document.getElementById('snake-draft');
        draftType = snakeDraftRadio && snakeDraftRadio.checked ? 'snake' : 'standard';
        console.log('Draft type:', draftType);
        
        // Get the draft order
        const draftOrderList = document.getElementById('draft-order-list');
        if (!draftOrderList) {
            showAlert('No draft order found!', 'danger');
            console.log('No draft order list found');
            return;
        }
        
        // Get all participants in the draft order
        const listItems = draftOrderList.querySelectorAll('li');
        console.log('Found list items:', listItems.length);
        
        draftOrder = [];
        listItems.forEach(item => {
            const participantId = item.getAttribute('data-participant-id');
            const participantName = item.textContent.trim().replace(/\s*\n\s*/g, '');
            console.log('Participant:', participantId, participantName);
            draftOrder.push({
                id: participantId,
                name: participantName
            });
        });
        
        console.log('Draft order:', draftOrder);
        
        if (draftOrder.length < 2) {
            showAlert('Need at least 2 participants to start a draft!', 'danger');
            console.log('Not enough participants');
            return;
        }
        
        // Start the draft
        isDraftModeActive = true;
        currentDraftRound = 1;
        currentDrafterIndex = 0;
        draftDirection = 'forward';
        
        // Save draft state to localStorage
        saveDraftStateToStorage();
        
        // Update UI
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-check me-1"></i> Draft Started';
        
        if (stopDraftBtn) {
            stopDraftBtn.style.display = 'block';
        }
        
        if (resumeDraftBtn) {
            resumeDraftBtn.style.display = 'none';
        }
        
        if (draftStatus) {
            draftStatus.style.display = 'block';
            updateDraftStatusDisplay();
        }
        
        // Set the participant select to the first drafter
        if (draftOrder.length > 0 && participantSelect) {
            participantSelect.value = draftOrder[0].id;
            
            // Show alert for who's on the clock
            showAlert(`${draftOrder[0].name} is on the clock!`, 'info');
        }
    });
    
    // Initialize stop draft button if it exists
    if (stopDraftBtn) {
        stopDraftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Stop draft button clicked');
            
            // Save the current state for resuming later
            if (resumeDraftBtn) {
                pausedDraftState = {
                    isDraftModeActive: true,
                    currentDraftRound,
                    currentDrafterIndex,
                    draftOrder,
                    draftType,
                    draftDirection,
                    autodraftParticipants
                };
                localStorage.setItem('pausedDraftState', JSON.stringify(pausedDraftState));
                console.log('Saved paused draft state:', pausedDraftState);
            }
            
            // Stop the draft
            isDraftModeActive = false;
            
            // Update localStorage
            saveDraftStateToStorage();
            
            // Update UI
            if (startDraftBtn) {
                startDraftBtn.disabled = false;
                startDraftBtn.innerHTML = '<i class="fas fa-play me-1"></i> Start Draft';
            }
            
            stopDraftBtn.style.display = 'none';
            
            if (resumeDraftBtn) {
                resumeDraftBtn.style.display = 'block';
            }
            
            if (draftStatus) {
                draftStatus.style.display = 'none';
            }
            
            // Show success message
            showAlert('Draft has been paused! Click "Resume Draft" to continue.', 'warning');
        });
    }
    
    // Initialize resume draft button if it exists
    if (resumeDraftBtn) {
        resumeDraftBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Resume draft button clicked');
            
            // Restore draft state from pausedDraftState
            if (pausedDraftState) {
                isDraftModeActive = true;
                currentDraftRound = pausedDraftState.currentDraftRound;
                currentDrafterIndex = pausedDraftState.currentDrafterIndex;
                draftOrder = pausedDraftState.draftOrder;
                draftType = pausedDraftState.draftType;
                draftDirection = pausedDraftState.draftDirection;
                autodraftParticipants = pausedDraftState.autodraftParticipants || {};
                
                // Save the restored state
                saveDraftStateToStorage();
                
                console.log('Restored draft state from pausedDraftState:', pausedDraftState);
            } else {
                console.log('No paused draft state found, using current state');
            }
            
            // Update UI
            if (startDraftBtn) {
                startDraftBtn.disabled = true;
                startDraftBtn.innerHTML = '<i class="fas fa-check me-1"></i> Draft Resumed';
            }
            
            if (stopDraftBtn) {
                stopDraftBtn.style.display = 'block';
            }
            
            resumeDraftBtn.style.display = 'none';
            
            if (draftStatus) {
                draftStatus.style.display = 'block';
                updateDraftStatusDisplay();
            }
            
            // Set the participant select to the current drafter
            const participantSelect = document.getElementById('participant-select');
            if (participantSelect && draftOrder.length > 0 && currentDrafterIndex < draftOrder.length) {
                const currentDrafter = draftOrder[currentDrafterIndex];
                if (currentDrafter && currentDrafter.id) {
                    console.log('Setting participant select to current drafter:', currentDrafter.name);
                    participantSelect.value = currentDrafter.id;
                }
            }
            
            // Show who's on the clock
            const currentDrafter = draftOrder[currentDrafterIndex];
            const directionIcon = draftDirection === 'forward' ? '↓' : '↑';
            showAlert(`Draft resumed! Round ${currentDraftRound}: ${currentDrafter.name} is on the clock! ${directionIcon}`, 'success');
        });
    }
}

// Function to update the draft status display
function updateDraftStatusDisplay() {
    const draftStatus = document.getElementById('draft-status');
    const currentRoundElement = document.getElementById('current-round');
    const currentDrafterElement = document.getElementById('current-drafter');
    const directionIndicator = document.getElementById('direction-indicator');
    
    if (!draftStatus || !currentRoundElement || !currentDrafterElement || !directionIndicator) {
        console.log('Draft status elements not found');
        return;
    }
    
    // Update round
    currentRoundElement.textContent = currentDraftRound;
    
    // Update direction indicator
    if (draftType === 'snake') {
        directionIndicator.className = draftDirection === 'forward' 
            ? 'badge bg-primary' 
            : 'badge bg-warning text-dark';
        
        directionIndicator.innerHTML = draftDirection === 'forward'
            ? '<i class="fas fa-arrow-down me-1"></i> Forward'
            : '<i class="fas fa-arrow-up me-1"></i> Backward';
    } else {
        directionIndicator.className = 'badge bg-info';
        directionIndicator.innerHTML = '<i class="fas fa-circle me-1"></i> Standard';
    }
    
    // Update current drafter
    if (draftOrder.length > 0 && currentDrafterIndex < draftOrder.length) {
        const currentDrafter = draftOrder[currentDrafterIndex];
        const directionIcon = draftDirection === 'forward' ? '↓' : '↑';
        currentDrafterElement.textContent = `${currentDrafter.name} ${directionIcon}`;
    } else {
        currentDrafterElement.textContent = '-';
    }
}

// Function to advance to next drafter
function advanceToNextDrafter() {
    if (!isDraftModeActive || draftOrder.length === 0) {
        console.log('Draft not active or no draft order');
        return;
    }
    
    console.log('Advancing to next drafter');
    console.log('Current drafter index:', currentDrafterIndex);
    console.log('Current round:', currentDraftRound);
    console.log('Draft direction:', draftDirection);
    
    // Determine next drafter based on draft type
    if (draftType === 'snake') {
        // In snake draft, direction changes at the end of each round
        if (draftDirection === 'forward') {
            currentDrafterIndex++;
            if (currentDrafterIndex >= draftOrder.length) {
                // End of round going forward, change direction to backward
                currentDrafterIndex = draftOrder.length - 1;
                draftDirection = 'backward';
                currentDraftRound++;
            }
        } else {
            // Going backward
            currentDrafterIndex--;
            if (currentDrafterIndex < 0) {
                // End of round going backward, change direction to forward
                currentDrafterIndex = 0;
                draftDirection = 'forward';
                currentDraftRound++;
            }
        }
    } else {
        // Standard draft, always go in the same order
        currentDrafterIndex = (currentDrafterIndex + 1) % draftOrder.length;
        if (currentDrafterIndex === 0) {
            currentDraftRound++;
        }
    }
    
    console.log('New drafter index:', currentDrafterIndex);
    console.log('New round:', currentDraftRound);
    console.log('New direction:', draftDirection);
    
    // Update the draft status display
    updateDraftStatusDisplay();
    
    // Update the participant select to the current drafter
    const participantSelect = document.getElementById('participant-select');
    const autodraftCheckbox = document.getElementById('autodraft-checkbox');
    
    if (participantSelect && currentDrafterIndex < draftOrder.length) {
        const currentDrafter = draftOrder[currentDrafterIndex];
        console.log('Setting participant select to:', currentDrafter.name);
        participantSelect.value = currentDrafter.id;
        
        // Update autodraft checkbox
        if (autodraftCheckbox) {
            autodraftCheckbox.checked = autodraftParticipants[currentDrafter.id] || false;
        }
        
        // Show alert for who's on the clock
        const directionIcon = draftDirection === 'forward' ? '↓' : '↑';
        showAlert(`${currentDrafter.name} is on the clock! ${directionIcon}`, 'info');
        
        // Check if autodraft is enabled for this participant
        if (autodraftParticipants[currentDrafter.id]) {
            console.log('Autodraft enabled for', currentDrafter.name);
            // Trigger autodraft after a short delay
            setTimeout(() => {
                autodraftPlayer(currentDrafter.id, currentDrafter.name);
            }, 1500); // Delay to allow UI to update and show who's on the clock
        }
    }
    
    // Save draft state to localStorage
    saveDraftStateToStorage();
}

// Function to autodraft a player for a participant
function autodraftPlayer(participantId, participantName) {
    if (!isDraftModeActive) {
        console.log('Draft not active, cannot autodraft');
        return;
    }
    
    console.log('Autodrafting for participant:', participantName);
    
    // Fetch available players
    fetch('/api/available_players')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch players');
            }
            return response.json();
        })
        .then(data => {
            // Get undrafted players
            const undraftedPlayers = data.undrafted;
            
            if (undraftedPlayers.length === 0) {
                console.log('No undrafted players available');
                showAlert('No players available for autodraft!', 'warning');
                return;
            }
            
            // Sort by PPG (highest first)
            undraftedPlayers.sort((a, b) => {
                const ppgA = parseFloat(a.ppg || 0);
                const ppgB = parseFloat(b.ppg || 0);
                return ppgB - ppgA;
            });
            
            // Get the player with the highest PPG
            const topPlayer = undraftedPlayers[0];
            console.log('Top player for autodraft:', topPlayer.name, 'PPG:', topPlayer.ppg);
            
            // Get the current draft position
            const draftPositionInput = document.getElementById('draft-position');
            const draftPosition = draftPositionInput ? draftPositionInput.value : null;
            
            // Draft the player
            fetch('/api/draft_pick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    player_id: topPlayer.id,
                    draft_position: draftPosition
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.error || 'Failed to autodraft player');
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    showAlert(`Autodraft Error: ${data.error}`, 'danger');
                } else {
                    // Increment draft position
                    if (draftPositionInput) {
                        draftPositionInput.value = parseInt(draftPositionInput.value) + 1;
                    }
                    
                    // Show success message
                    showAlert(`AUTODRAFT: ${topPlayer.name} (${topPlayer.ppg} PPG) drafted by ${participantName}!`, 'success');
                    
                    // Update draft board and reload players
                    setTimeout(() => {
                        updateDraftBoard();
                        loadAvailablePlayers();
                        
                        // Advance to next drafter
                        setTimeout(() => {
                            advanceToNextDrafter();
                        }, 1000);
                    }, 500);
                }
            })
            .catch(error => {
                console.error('Autodraft Error:', error);
                showAlert(`Autodraft Error: ${error.message || 'An error occurred while autodrafting.'}`, 'danger');
            });
        })
        .catch(error => {
            console.error('Error fetching players for autodraft:', error);
            showAlert(`Autodraft Error: ${error.message || 'Failed to fetch players for autodraft.'}`, 'danger');
        });
}

// Function to initialize remove draft buttons
function initializeRemoveDraftButtons() {
    const removeDraftButtons = document.querySelectorAll('.remove-draft-btn');
    
    removeDraftButtons.forEach(button => {
        // Remove existing event listeners to prevent duplicates
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', function() {
            const pickId = this.dataset.pickId;
            const playerName = this.dataset.playerName;
            
            if (confirm(`Are you sure you want to remove ${playerName} from the draft?`)) {
                // Send delete request to server
                fetch(`/api/draft_pick/${pickId}`, {
                    method: 'DELETE',
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(err => {
                            throw new Error(err.error || 'Failed to remove draft pick');
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    // Remove draft pick from UI
                    const draftPick = document.querySelector(`.draft-pick[data-pick-id="${pickId}"]`);
                    if (draftPick) {
                        draftPick.remove();
                    }
                    
                    // Show success message
                    showAlert(`${playerName} removed from draft!`, 'success');
                    
                    // Update draft board and reload available players
                    updateDraftBoard();
                    loadAvailablePlayers();
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert(`Error: ${error.message || 'An error occurred while removing the draft pick.'}`, 'danger');
                });
            }
        });
    });
}

// Function to update the draft board
function updateDraftBoard() {
    const draftBoard = document.getElementById('draft-board');
    if (!draftBoard) return;
    
    // Show loading indicator
    draftBoard.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">Loading draft data...</p></div>';
    
    // Also update the draft table if it exists
    const draftTable = document.querySelector('.table-responsive table tbody');
    
    // Fetch latest draft data
    fetch('/api/draft_picks')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch draft data');
            }
            return response.json();
        })
        .then(data => {
            // Clear current draft board
            draftBoard.innerHTML = '';
            
            // Update draft table if it exists
            if (draftTable) {
                draftTable.innerHTML = '';
                
                // Sort picks by draft position
                const sortedPicks = [...data].sort((a, b) => a.draft_position - b.draft_position);
                
                // Add each pick to the table
                sortedPicks.forEach(pick => {
                    const row = document.createElement('tr');
                    row.className = 'draft-pick';
                    row.dataset.pickId = pick.id;
                    
                    row.innerHTML = `
                        <td>${pick.draft_position}</td>
                        <td>${pick.participant_name}</td>
                        <td>${pick.player_name}</td>
                        <td>
                            <span class="player-seed">${pick.player_school.split(' ')[0]}</span>
                            ${pick.player_school.split(' ').slice(1).join(' ')}
                        </td>
                        <td>${pick.player_ppg} PPG</td>
                        <td>
                            <button class="btn btn-sm btn-danger remove-draft-btn" 
                                    data-pick-id="${pick.id}" 
                                    data-player-name="${pick.player_name}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    `;
                    
                    draftTable.appendChild(row);
                });
                
                // Reinitialize remove draft buttons
                initializeRemoveDraftButtons();
            }
            
            // Group picks by participant
            const picksByParticipant = {};
            data.forEach(pick => {
                if (!picksByParticipant[pick.participant_id]) {
                    picksByParticipant[pick.participant_id] = [];
                }
                picksByParticipant[pick.participant_id].push(pick);
            });
            
            // Create draft board columns
            for (const participantId in picksByParticipant) {
                const picks = picksByParticipant[participantId];
                const participantName = picks[0].participant_name;
                
                const column = document.createElement('div');
                column.className = 'col-md-3 mb-4';
                
                const card = document.createElement('div');
                card.className = 'card h-100';
                
                const cardHeader = document.createElement('div');
                cardHeader.className = 'card-header';
                cardHeader.textContent = participantName;
                
                const cardBody = document.createElement('div');
                cardBody.className = 'card-body';
                
                const playerList = document.createElement('ul');
                playerList.className = 'list-group';
                
                picks.forEach(pick => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item';
                    listItem.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="draft-pick-number">#${pick.draft_position}</span>
                                <span class="ms-2">${pick.player_name}</span>
                            </div>
                            <span class="badge bg-primary">${pick.player_school}</span>
                        </div>
                        <div class="player-stats mt-1">
                            ${pick.player_ppg} PPG | ${pick.player_rpg} RPG | ${pick.player_apg} APG
                        </div>
                    `;
                    playerList.appendChild(listItem);
                });
                
                cardBody.appendChild(playerList);
                card.appendChild(cardHeader);
                card.appendChild(cardBody);
                column.appendChild(card);
                draftBoard.appendChild(column);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while updating the draft board.', 'danger');
        });
}

// Function to initialize reset draft button
function initResetDraftButton() {
    const resetDraftBtn = document.getElementById('reset-draft-btn');
    if (!resetDraftBtn) {
        console.log('No reset draft button found');
        return;
    }
    
    console.log('Found reset draft button');
    
    resetDraftBtn.addEventListener('click', function(e) {
        console.log('Reset draft button clicked');
        e.preventDefault();
        
        // Confirm before resetting
        if (!confirm('Are you sure you want to reset the draft? This will delete ALL draft picks and make all players available again.')) {
            console.log('Reset cancelled');
            return;
        }
        
        // Show loading state
        resetDraftBtn.disabled = true;
        resetDraftBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Resetting...';
        
        // Call API to delete all draft picks
        fetch('/api/draft_picks/reset', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Failed to reset draft');
                });
            }
            return response.json();
        })
        .then(data => {
            // Reset draft mode if active
            if (isDraftModeActive) {
                isDraftModeActive = false;
                
                // Clear draft state from localStorage
                clearDraftStateFromStorage();
                
                // Reset UI for draft mode
                const startDraftBtn = document.getElementById('start-draft-btn');
                const stopDraftBtn = document.getElementById('stop-draft-btn');
                const resumeDraftBtn = document.getElementById('resume-draft-btn');
                const draftStatus = document.getElementById('draft-status');
                
                if (startDraftBtn) {
                    startDraftBtn.disabled = false;
                    startDraftBtn.innerHTML = '<i class="fas fa-play me-1"></i> Start Draft';
                }
                
                if (stopDraftBtn) {
                    stopDraftBtn.style.display = 'none';
                }
                
                if (resumeDraftBtn) {
                    resumeDraftBtn.style.display = 'none';
                }
                
                if (draftStatus) {
                    draftStatus.style.display = 'none';
                }
            } else {
                // Even if draft is not active, clear any paused state
                clearDraftStateFromStorage();
                
                // Hide resume button if it exists
                const resumeDraftBtn = document.getElementById('resume-draft-btn');
                if (resumeDraftBtn) {
                    resumeDraftBtn.style.display = 'none';
                }
            }
            
            // Reset draft position input
            const draftPositionInput = document.getElementById('draft-position');
            if (draftPositionInput) {
                draftPositionInput.value = '1';
            }
            
            // Show success message
            showAlert('Draft has been reset! All players are now available again.', 'success');
            
            // Reload the page to reflect changes
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(`Error: ${error.message || 'An error occurred while resetting the draft.'}`, 'danger');
            
            // Reset button state
            resetDraftBtn.disabled = false;
            resetDraftBtn.innerHTML = '<i class="fas fa-trash me-1"></i> Reset Draft';
        });
    });
}

// Function to save draft state to localStorage
function saveDraftStateToStorage() {
    if (isDraftModeActive) {
        const draftState = {
            isDraftModeActive,
            currentDraftRound,
            currentDrafterIndex,
            draftOrder,
            draftType,
            draftDirection,
            autodraftParticipants
        };
        localStorage.setItem('draftState', JSON.stringify(draftState));
        console.log('Saved draft state:', draftState);
    } else {
        localStorage.removeItem('draftState');
        console.log('Cleared draft state');
    }
}

// Function to load draft state from localStorage
function loadDraftStateFromStorage() {
    const draftStateJson = localStorage.getItem('draftState');
    if (draftStateJson) {
        try {
            const draftState = JSON.parse(draftStateJson);
            console.log('Loaded draft state:', draftState);
            
            isDraftModeActive = draftState.isDraftModeActive;
            currentDraftRound = draftState.currentDraftRound;
            currentDrafterIndex = draftState.currentDrafterIndex;
            draftOrder = draftState.draftOrder;
            draftType = draftState.draftType;
            draftDirection = draftState.draftDirection;
            autodraftParticipants = draftState.autodraftParticipants || {};
            
            // If draft is active, update UI
            if (isDraftModeActive) {
                const startDraftBtn = document.getElementById('start-draft-btn');
                const stopDraftBtn = document.getElementById('stop-draft-btn');
                const resumeDraftBtn = document.getElementById('resume-draft-btn');
                const draftStatus = document.getElementById('draft-status');
                const participantSelect = document.getElementById('participant-select');
                
                if (startDraftBtn) {
                    startDraftBtn.disabled = true;
                    startDraftBtn.innerHTML = '<i class="fas fa-check me-1"></i> Draft Started';
                }
                
                if (stopDraftBtn) {
                    stopDraftBtn.style.display = 'block';
                }
                
                if (resumeDraftBtn) {
                    resumeDraftBtn.style.display = 'none';
                }
                
                if (draftStatus) {
                    draftStatus.style.display = 'block';
                    updateDraftStatusDisplay();
                }
                
                // Restore the current drafter selection
                if (participantSelect && draftOrder.length > 0 && currentDrafterIndex < draftOrder.length) {
                    const currentDrafter = draftOrder[currentDrafterIndex];
                    if (currentDrafter && currentDrafter.id) {
                        console.log('Setting participant select to current drafter:', currentDrafter.name);
                        participantSelect.value = currentDrafter.id;
                        
                        // Show who's on the clock
                        showAlert(`${currentDrafter.name} is on the clock!`, 'info');
                    }
                }
            } else {
                // Check if we have a paused draft state
                const pausedState = localStorage.getItem('pausedDraftState');
                if (pausedState) {
                    pausedDraftState = JSON.parse(pausedState);
                    console.log('Found paused draft state:', pausedDraftState);
                    
                    // Show resume button
                    const resumeDraftBtn = document.getElementById('resume-draft-btn');
                    if (resumeDraftBtn) {
                        resumeDraftBtn.style.display = 'block';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading draft state from localStorage:', error);
        }
    }
}

// Function to clear draft state from localStorage
function clearDraftStateFromStorage() {
    localStorage.removeItem('draftState');
    localStorage.removeItem('pausedDraftState');
    pausedDraftState = null;
    autodraftParticipants = {};
    console.log('Cleared draft state from localStorage');
}

// Function to manually trigger data update
function updateData() {
    const updateButton = document.getElementById('update-data-btn');
    if (updateButton) {
        updateButton.disabled = true;
        updateButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
    }
    
    fetch('/api/update_data', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAlert(`Error: ${data.error}`, 'danger');
        } else {
            showAlert('Data updated successfully! Refreshing page...', 'success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while updating data.', 'danger');
    })
    .finally(() => {
        if (updateButton) {
            updateButton.disabled = false;
            updateButton.innerHTML = 'Update Data';
        }
    });
}
