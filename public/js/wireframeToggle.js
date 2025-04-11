// In public/js/wireframeToggle.js
export class WireframeToggle {
    constructor(game) {
        this.game = game;
        this.active = false;
        
        this.createToggleButton();
    }
    
    createToggleButton() {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-wireframe-btn';
        toggleBtn.textContent = 'Show Wireframes';
        toggleBtn.style.position = 'fixed';
        toggleBtn.style.top = '10px';
        toggleBtn.style.left = '10px';
        toggleBtn.style.zIndex = '1000';
        toggleBtn.style.padding = '8px 12px';
        toggleBtn.style.backgroundColor = '#444';
        toggleBtn.style.color = 'white';
        toggleBtn.style.border = 'none';
        toggleBtn.style.borderRadius = '4px';
        toggleBtn.style.cursor = 'pointer';
        
        document.body.appendChild(toggleBtn);
        
        // Set up click event
        toggleBtn.addEventListener('click', () => {
            // Call the toggle method on the hexGrid
            if (this.game.hexGrid.toggleWireframes) {
                this.active = this.game.hexGrid.toggleWireframes();
                toggleBtn.textContent = this.active ? 'Hide Wireframes' : 'Show Wireframes';
            }
        });
    }
}