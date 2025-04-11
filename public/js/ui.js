// public/js/ui.js
export class UI {
  constructor(game) {
    this.game = game;
    this.createRoomBtn = document.getElementById('create-room-btn');
    this.joinRoomBtn = document.getElementById('join-room-btn');
    this.roomIdInput = document.getElementById('room-id-input');
    this.roomInfo = document.getElementById('room-info');
    this.gameControls = document.getElementById('game-controls');
    this.roomControls = document.getElementById('room-controls');

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.createRoomBtn.addEventListener('click', () => {
      console.log('Create room button clicked');
      this.createRoomBtn.disabled = true;
      this.createRoomBtn.textContent = 'Creating...';

      try {
        this.game.createRoom();

        // Reset button after 5 seconds if no response
        setTimeout(() => {
          if (!this.game.roomId) {
            this.createRoomBtn.disabled = false;
            this.createRoomBtn.textContent = 'Create Room';
            console.log('Room creation timed out');
          }
        }, 5000);
      } catch (error) {
        console.error('Error in create room handler:', error);
        this.createRoomBtn.disabled = false;
        this.createRoomBtn.textContent = 'Create Room';
      }
    });

    this.joinRoomBtn.addEventListener('click', () => {
      const roomId = this.roomIdInput.value.trim();
      if (roomId) {
        this.game.joinRoom(roomId);
      } else {
        alert('Please enter a valid Room ID');
      }
    });

    // Add keyboard shortcut for camera view modes
    window.addEventListener('keydown', (event) => {
      if (this.game.roomId) {
        switch (event.key) {
          case '1':
            this.game.cameraManager.setViewMode('orbital');
            break;
          case '2':
            this.game.cameraManager.setViewMode('birds-eye');
            break;
          case '3':
            this.game.cameraManager.setViewMode('first-person');
            break;
        }
      }
    });
  }

  updateRoomInfo(roomId) {
    console.log('Updating room info for room:', roomId);
    this.roomInfo.innerHTML = `
      <p>Room ID: <strong>${roomId}</strong></p>
      <p>Share this ID with others to join your game.</p>
    `;
  }

  showGameControls() {
    console.log('Showing game controls');
    this.gameControls.style.display = 'block';
    // Hide room creation UI but keep room info visible
    this.createRoomBtn.style.display = 'none';
    this.roomIdInput.style.display = 'none';
    this.joinRoomBtn.style.display = 'none';
  }
}