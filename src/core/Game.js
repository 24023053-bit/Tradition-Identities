import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Player } from './Player.js';
import { Gate } from '../map/Gate.js';
import { Map01 } from '../map/Map01.js';
import { Vm } from '../map/Vm.js';
import { chua } from '../map/chua.js';
import { PhysicsManager } from '../systems/PhysicsManager.js';
import { UIManager } from '../systems/UIManager.js';

export class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.collected = [];
        this.currentLevel = null;
        this.levelName = 'Gate';
        this.isTransitioning = false;
        this.isDead = false;
        this._persistentObjects = new Set();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f0f1e);

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 20;
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect,
            viewSize, -viewSize,
            -100, 2000
        );
        this.camera.position.set(15, 20, 15);
        this.camera.lookAt(0, 0, 0);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambient);
        this._persistentObjects.add(ambient.uuid);

        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(15, 30, 15);
        sun.castShadow = true;
        this.scene.add(sun);
        this._persistentObjects.add(sun.uuid);

        this.physics = new PhysicsManager();
        this.ui = new UIManager();
        this.player = new Player(this.scene, this.physics.world);
        this._persistentObjects.add(this.player.mesh.uuid);

        this.loadLevel('Gate');

        window.addEventListener('mousedown', (e) => this.handleClick(e));
        window.addEventListener('resize', () => this.onWindowResize());

        this.animate();
    }

    start() {
        const startScreen = document.getElementById('start-screen');
        if (startScreen) startScreen.style.display = 'none';

        this.player.reset();
        this.collected = [];
        this.isDead = false;
        this.ui.reset();
    }

    function () {
        const bar  = document.getElementById('loading-bar-fill');
        const tip  = document.getElementById('loading-tip');
        const btn  = document.getElementById('loading-start-btn');
        if (!bar) return;

        const tips = ['Đang tải thế giới...', 'Pha màu sắc...', 'Chuẩn bị hành trình...', 'Gần xong rồi...'];
        let p = 0, ti = 0;

        const iv = setInterval(() => {
            const step = p < 60 ? 2.2 : p < 85 ? 0.9 : 0.3;
            p = Math.min(p + step, 99);
            bar.style.width = p.toFixed(1) + '%';

            if (p > 25 && ti < 1) { ti = 1; tip.textContent = tips[1]; }
            if (p > 55 && ti < 2) { ti = 2; tip.textContent = tips[2]; }
            if (p > 82 && ti < 3) { ti = 3; tip.textContent = tips[3]; }
        }, 55);

        window.addEventListener('load', () => {
            clearInterval(iv);
            bar.style.width = '100%';
            tip.textContent = 'Sẵn sàng!';
            setTimeout(() => { btn.style.display = 'block'; }, 400);
        });
    }

    clearScene() {
        const toRemove = [];
        this.scene.traverse((obj) => {
            if (this._persistentObjects.has(obj.uuid)) return;
            if (obj === this.scene) return;
            if (obj.parent !== this.scene) return;
            toRemove.push(obj);
        });
        toRemove.forEach(obj => this.scene.remove(obj));
        console.log(`🗑️ Cleared ${toRemove.length} objects from scene`);
    }

    loadLevel(level) {
        this.clearScene();
        this.currentLevel = null;

        if (level === 'Gate') {
            this.currentLevel = new Gate(this.scene, this.physics.world);
            this.levelName = 'Gate';
            console.log("📍 Loaded: Gate");
        }
        else if (level === 'Map01') {
            this.currentLevel = new Map01(this.scene, this.physics.world);
            this.levelName = 'Map01';
            this.collected = [];
            this.ui.reset();
            console.log("📍 Loaded: Map01");
        }
        else if (level === 'Vm') {
            this.currentLevel = new Vm(this.scene, this.physics.world);
            this.levelName = 'Vm';
            this.collected = [];
            this.ui.reset();
            console.log("📍 Loaded: Vm");
        }
        else if (level === 'chua') {
            this.currentLevel = new chua(this.scene, this.physics.world);
            this.levelName = 'chua';
            this.collected = [];
            this.ui.reset();
            console.log("📍 Loaded: chua");
        }
    }

    checkItemCollision() {
        const level = this.levelName;
        if (level !== 'Map01' && level !== 'Vm' && level !== 'chua') return;
        if (!this.currentLevel || !this.currentLevel.colorItems) return;

        const playerPos = this.player.body.position;

        this.currentLevel.colorItems.forEach((item) => {
            if (item.collected) return;

            const dx = playerPos.x - item.model.position.x;
            const dz = playerPos.z - item.model.position.z;
            const dy = Math.abs(playerPos.y - item.model.position.y);
            const distXZ = Math.sqrt(dx * dx + dz * dz);

            if (distXZ < 1.2 && dy < 2) {
                this.handleCollect(item);
            }
        });
    }

    handleCollect(item) {
        item.collected = true;
        item.model.visible = false;

        const colorHex = item.model.material.color.getHex();
        this.ui.activateSlot(this.collected.length, colorHex);

        this.collected.push(item);
        console.log(`✅ Đã nhặt: ${this.collected.length}/3`);

        this.checkLevelComplete();
    }

    checkLevelComplete() {
        if (this.collected.length < 3) return;
        if (this.isTransitioning) return;

        if (this.levelName === 'Map01') {
            // Map01 → Vm, spawn sân trước Vm
            this.transitionTo('Vm', 0, 2, 21);
        }
        else if (this.levelName === 'Vm') {
            // Vm → Chua, spawn bãi cỏ Chua
            this.transitionTo('chua', 0, 2, 35);
        }
        else if (this.levelName === 'chua') {
            // Chua → màn hình thắng
            this.showWinScreen();
        }
    }

    transitionTo(level, spawnX, spawnY, spawnZ) {
        this.isTransitioning = true;
        console.log(`🚀 Chuyển sang ${level}...`);

        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; top: 0; left: 0;
            width: 100%; height: 100%;
            background: white; opacity: 0;
            transition: opacity 0.8s ease;
            pointer-events: none; z-index: 9999;
        `;
        document.body.appendChild(flash);

        setTimeout(() => { flash.style.opacity = '1'; }, 100);

        setTimeout(() => {
            this.loadLevel(level);

            this.player.body.position.set(spawnX, spawnY, spawnZ);
            this.player.body.velocity.set(0, 0, 0);
            this.player.body.angularVelocity.set(0, 0, 0);
            this.player.target = null;
            this.isDead = false;

            flash.style.opacity = '0';

            setTimeout(() => {
                document.body.removeChild(flash);
                this.isTransitioning = false;
                console.log(`✅ Đã vào ${level}`);
            }, 800);

        }, 1000);
    }

    showWinScreen() {
        this.player.target = null;
        this.player.body.velocity.set(0, 0, 0);

        const overlay = document.createElement('div');
        overlay.id = 'win-screen';
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.85);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 9999; color: white;
            font-family: 'Segoe UI', sans-serif;
        `;

        overlay.innerHTML = `
            <div style="font-size:3rem;margin-bottom:0.5rem;">🏆</div>
            <h2 style="font-size:2rem;margin-bottom:0.5rem;">Hoàn thành!</h2>
            <p style="margin-bottom:2rem;color:#aaa;">Bạn đã thu thập tất cả hiện vật.</p>
            <button id="btn-restart" style="
                padding:0.75rem 2.5rem; font-size:1.1rem;
                background:#ffdd00; color:#000;
                border:none; border-radius:10px;
                cursor:pointer; font-weight:bold;
            ">🔄 Chơi lại từ đầu</button>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-restart').onclick = () => {
            overlay.remove();
            this.loadLevel('Gate');
            this.player.reset();
            this.collected = [];
            this.isDead = false;
            this.ui.reset();
        };
    }

    checkWaterDeath() {
        if (this.levelName !== 'Map01' || !this.currentLevel) return;
        if (this.isDead || !this.player.alive) return;

        const playerPos = this.player.body.position;

        if (playerPos.y < -2) {
            this.triggerDeath();
            return;
        }

        if (!this.currentLevel.landMeshes || this.currentLevel.landMeshes.length === 0) return;

        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z),
            new THREE.Vector3(0, -1, 0)
        );

        const intersects = raycaster.intersectObjects(this.currentLevel.landMeshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.object.userData.isWater && hit.distance < 1.2) {
                this.triggerDeath();
            }
        }
    }

    triggerDeath() {
        if (this.isDead) return;
        this.isDead = true;

        this.player.alive = false;
        this.player.target = null;
        this.player.body.velocity.set(0, 0, 0);
        this.player.body.angularVelocity.set(0, 0, 0);

        this.showDeathScreen();
    }

    showDeathScreen() {
        const existing = document.getElementById('death-screen');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'death-screen';
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.78);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 9999; color: white;
            font-family: 'Segoe UI', sans-serif;
        `;

        overlay.innerHTML = `
            <div style="font-size:3rem;margin-bottom:0.5rem;">💀</div>
            <h2 style="font-size:1.8rem;margin-bottom:0.5rem;">Bạn đã chết đuối!</h2>
            <p style="margin-bottom:2rem;color:#aaa;">Bạn có muốn chơi lại không?</p>
            <button id="btn-retry" style="
                padding:0.75rem 2.5rem; font-size:1.1rem;
                background:#00ddff; color:#000;
                border:none; border-radius:10px;
                cursor:pointer; font-weight:bold;
            ">🔄 Chơi lại</button>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-retry').onclick = () => {
            overlay.remove();
            this.restartMap01();
        };
    }

    restartMap01() {
        this.isDead = false;
        this.collected = [];
        if (this.ui && this.ui.reset) this.ui.reset();

        this.loadLevel('Map01');

        this.player.alive = true;
        this.player.target = null;
        this.player.body.position.set(-18, 3, 20);
        this.player.body.velocity.set(0, 0, 0);
        this.player.body.angularVelocity.set(0, 0, 0);

        console.log("✅ Restart Map01");
    }

    handleClick(event) {
        if (!this.player.alive || event.button !== 0) return;
        if (this.isDead || this.isTransitioning) return;
        if (!this.currentLevel || !this.currentLevel.landMeshes) return;

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        const intersects = raycaster.intersectObjects(this.currentLevel.landMeshes);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.player.setTarget(point.x, point.z);
        }
    }

    checkPortalTrigger() {
        if (this.levelName !== 'Gate' || this.isTransitioning) return;
        if (!this.currentLevel || !this.currentLevel.portalTrigger) return;

        const playerPos = this.player.body.position;
        const trigger = this.currentLevel.portalTrigger;

        const insideX = Math.abs(playerPos.x - trigger.x) < trigger.width / 2;
        const insideZ = Math.abs(playerPos.z - trigger.z) < trigger.depth / 2;

        if (insideX && insideZ) {
            this.enterPortal();
        }
    }

    enterPortal() {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed; top: 0; left: 0;
            width: 100%; height: 100%;
            background: white; opacity: 0;
            transition: opacity 1s ease;
            pointer-events: none; z-index: 9999;
        `;
        document.body.appendChild(flash);

        setTimeout(() => flash.style.opacity = '1', 100);

        setTimeout(() => {
            this.loadLevel('Map01');

            this.player.body.position.set(-18, 3, 20);
            this.player.body.velocity.set(0, 0, 0);
            this.player.body.angularVelocity.set(0, 0, 0);
            this.player.target = null;
            this.isDead = false;

            flash.style.opacity = '0';

            setTimeout(() => {
                document.body.removeChild(flash);
                setTimeout(() => { this.isTransitioning = false; }, 1500);
            }, 1000);

        }, 1200);
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 20;

        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.top = viewSize;
        this.camera.bottom = -viewSize;

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = Math.min(this.clock.getDelta(), 0.1);

        this.physics.update(delta);
        this.player.update(delta);

        this.checkItemCollision();
        this.checkPortalTrigger();
        this.checkWaterDeath();

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}