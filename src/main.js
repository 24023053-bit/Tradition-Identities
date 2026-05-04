import * as THREE from 'three';
import { Game } from './core/Game.js';

let gameInstance;

window.addEventListener('load', () => {
    gameInstance = new Game();
    window.game = gameInstance;   // cho các hàm onclick trong HTML gọi được
    gameInstance.init();
});