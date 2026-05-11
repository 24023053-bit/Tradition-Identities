import * as THREE from 'three';
import { Game } from './core/Game.js';

window.addEventListener('load', () => {
    const loadingBar = document.getElementById('loading-bar');
    const startScreen = document.getElementById('start-screen');

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 8;
        if (progress >= 100) {
            progress = 100;
            loadingBar.style.width = '100%';
            clearInterval(interval);

            setTimeout(() => {
                startScreen.style.transition = 'opacity 0.8s ease';
                startScreen.style.opacity = '0';
                setTimeout(() => {
                    startScreen.style.display = 'none';
                    const gameInstance = new Game();
                    window.game = gameInstance;
                    gameInstance.init();
                }, 800);
            }, 500);
            return;
        }
        loadingBar.style.width = progress + '%';
    }, 100);
});