// public/js/character.js
export class Character {
    constructor(scene, hexGrid, id, isLocalPlayer = false) {
      this.scene = scene;
      this.hexGrid = hexGrid;
      this.id = id;
      this.isLocalPlayer = isLocalPlayer;
      this.position = { q: 0, r: 0, s: 0 };
      this.elevation = 0;
      this.mesh = null;
      
      this.createMesh();
      this.placeOnHex(0, 0, 0);
    }
    
    createMesh() {
      // Create a simple character mesh (cylinder with sphere head)
      const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8);
      const headGeometry = new THREE.SphereGeometry(0.2, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: this.isLocalPlayer ? 0x00ff00 : 0xff0000
      });
      
      // Create body
      const body = new THREE.Mesh(bodyGeometry, material);
      body.position.y = 0.3; // Half the height
      
      // Create head
      const head = new THREE.Mesh(headGeometry, material);
      head.position.y = 0.7; // Place on top of body
      
      // Create group to hold all parts
      this.mesh = new THREE.Group();
      this.mesh.add(body);
      this.mesh.add(head);
      
      // Add character name label
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      context.font = '32px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText(this.id.substring(0, 8), 128, 40);
      
      const texture = new THREE.CanvasTexture(canvas);
      const labelMaterial = new THREE.SpriteMaterial({ map: texture });
      const label = new THREE.Sprite(labelMaterial);
      label.position.y = 1.2;
      label.scale.set(1.5, 0.4, 1);
      
      this.mesh.add(label);
      this.scene.add(this.mesh);
    }
    
    placeOnHex(q, r, s) {
      // Update coordinates
      this.position = { q, r, s };
      
      // Get the world position of the hex
      const hexMesh = this.hexGrid.getHex(q, r, s);
      
      if (hexMesh) {
        const worldPos = this.hexGrid.cubeToWorld(q, r, s);
        this.elevation = hexMesh.userData.elevation;
        
        // Place character on top of the hex
        this.mesh.position.set(
          worldPos.x,
          hexMesh.position.y + this.hexGrid.hexHeight,
          worldPos.z
        );
      }
    }
    
    moveTo(q, r, s) {
      // Check if the target hex exists
      const hexMesh = this.hexGrid.getHex(q, r, s);
      
      if (!hexMesh) return false;
      
      // Check if this is a valid move (adjacent hex)
      const currentPos = this.position;
      const distance = this.hexGrid.getDistance(
        currentPos.q, currentPos.r, currentPos.s,
        q, r, s
      );
      
      if (distance > 1) return false;
      
      // Check elevation difference (can't climb too high)
      const targetElevation = hexMesh.userData.elevation;
      if (targetElevation - this.elevation > 1) return false;
      
      // Move the character
      this.placeOnHex(q, r, s);
      return true;
    }
    
    update() {
      // Any per-frame updates can go here
    }
  }