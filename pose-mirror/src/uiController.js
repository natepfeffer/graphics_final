// UI Controller
//------------------------------------------------------------------------------
// Handles UI state updates and status messages
//------------------------------------------------------------------------------

export class UIController {
  constructor() {
    this.statusElement = document.getElementById('status');
    this.startButton = document.getElementById('startCameraBtn');
    this.stopButton = document.getElementById('stopCameraBtn');
  }

  updateStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
    }
  }

  setCameraRunning(running) {
    if (this.startButton) {
      this.startButton.disabled = running;
    }
    if (this.stopButton) {
      this.stopButton.disabled = !running;
    }
  }
}

