// public/js/characterManager.js
import { Character } from './character.js';

export class CharacterManager {
  constructor(game) {
    this.game = game;
    this.characters = {};
    this.localCharacter = null;
  }
  
  createLocalCharacter(id) {
    this.localCharacter = new Character(
      this.game.scene,
      this.game.hexGrid,
      id,
      true
    );
    
    this.characters[id] = this.localCharacter;
    return this.localCharacter;
  }
  
  createRemoteCharacter(id) {
    const character = new Character(
      this.game.scene,
      this.game.hexGrid,
      id,
      false
    );
    
    this.characters[id] = character;
    return character;
  }
  
  removeCharacter(id) {
    if (this.characters[id]) {
      this.game.scene.remove(this.characters[id].mesh);
      delete this.characters[id];
      
      if (this.localCharacter && this.localCharacter.id === id) {
        this.localCharacter = null;
      }
    }
  }
  
  updateCharacterPosition(id, q, r, s) {
    if (this.characters[id]) {
      this.characters[id].placeOnHex(q, r, s);
    }
  }
  
  moveLocalCharacter(q, r, s) {
    if (this.localCharacter && this.localCharacter.moveTo(q, r, s)) {
      // Send position update to server
      this.game.socketManager.updateCharacterPosition(
        this.localCharacter.id,
        q, r, s
      );
      return true;
    }
    return false;
  }
}