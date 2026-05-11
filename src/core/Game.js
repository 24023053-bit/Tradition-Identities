import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';

import { Player } from './Player.js';
import { Gate } from '../map/Gate.js';
import { Map01 } from '../map/Map01.js';
import { Vm } from '../map/Vm.js';
import { chua } from '../map/chua.js';
import { PhysicsManager } from '../systems/PhysicsManager.js';
import { UIManager } from '../systems/UIManager.js';
import { QUEST_DATA } from './Quests.js';

export class Game {
    constructor() {
        this.clock = new THREE.Clock(); //tính thời gian frame
        this.collected = []; //mảng chứa item đã nhặt
        this.currentLevel = null; // lưu map hiện tại
        this.levelName = 'Gate'; // bắt đầu bằng map cổng
        this.isTransitioning = false; // kiểm tra chuyển map
        this.isDead = false; //chớt
        this._persistentObjects = new Set(); // list object cần đổi khi chuyển map
        this._tempV3 = new THREE.Vector3(); // tọa độ 3d của vật thể
        this.isQuizOpen = false;
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000); 

        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true //chống răng cưa 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight); //kích thước cửa sổ theo kích thước màn hình trình duyệt
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // tỷ lệ pixel của màn hình
        this.renderer.shadowMap.enabled = true; // đổ bóng 

        const aspect = window.innerWidth / window.innerHeight; // tỷ lệ màn hình
        const viewSize = 20; //độ rộng mà camera soi tới 
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect, viewSize * aspect, 
            viewSize, -viewSize, -100, 2000
        );
        this.camera.position.set(15, 20, 15); // vị trí camera
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
        this.ui = new UIManager(this);
        this.player = new Player(this.scene, this.physics.world);
        this._persistentObjects.add(this.player.mesh.uuid);

        this.initPostProcessing();
        this.loadLevel('Gate');

        window.addEventListener('mousedown', (e) => this.handleClick(e));
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Custom shader blend màu gốc + grayscale
        const GrayscaleBlendShader = {
            uniforms: {
                tDiffuse: { value: null },
                amount: { value: 0.95 } // 0 = màu gốc, 1 = đen trắng hoàn toàn
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float amount;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(tDiffuse, vUv);
                    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                    gl_FragColor = vec4(mix(color.rgb, vec3(gray), amount), color.a);
                }
            `
        };

        this.grayscalePass = new ShaderPass(GrayscaleBlendShader);
        this.grayscalePass.enabled = true;
        this.composer.addPass(this.grayscalePass);
    }

    start() {
        this.player.reset();
        this.collected = [];
        this.isDead = false;
        this.ui.reset();
        
        // Khi bắt đầu game, bật lại đen trắng
        if (this.grayscalePass) this.grayscalePass.enabled = true;
    }
    
    handleClick(event) {
        if (!this.player.alive || event.button !== 0 || this.isDead || this.isTransitioning) return;
        if (!this.currentLevel?.landMeshes) return;

        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.camera);

        // Bắn tia và lấy tất cả các mặt phẳng va chạm (landMeshes)
        const intersects = raycaster.intersectObjects(this.currentLevel.landMeshes);

        if (intersects.length > 0) {
            // Sắp xếp các điểm va chạm theo tọa độ Y giảm dần (ưu tiên điểm cao nhất/tầng 2)[cite: 5]
            intersects.sort((a, b) => b.point.y - a.point.y);

            const targetPoint = intersects[0].point;
            
            // Truyền cả x, z và độ cao y để nhân vật nhắm đúng tầng[cite: 5]
            this.player.setTarget(targetPoint.x, targetPoint.z, targetPoint.y);
            
            console.log(`🎯 Di chuyển tới: x:${targetPoint.x.toFixed(1)}, y:${targetPoint.y.toFixed(1)}, z:${targetPoint.z.toFixed(1)}`);
        }
    }

    // Giả sử player chạm vào vùng trigger của Chùa
    onPlayerEnterChuaArea() {
        const quest = QUEST_DATA.map_chua.quests[0];
        this.uiManager.showQuiz(quest);
    }

    loadLevel(level) {
        this.clearScene();
        this.levelName = level;
        this.collected = [];
        this.ui.reset();

        if (this.grayscalePass) this.grayscalePass.enabled = true;

        // chuyển map 
        switch(level) {
            case 'Gate': this.currentLevel = new Gate(this.scene, this.physics.world); break;
            case 'Map01': this.currentLevel = new Map01(this.scene, this.physics.world); break;
            case 'Vm': this.currentLevel = new Vm(this.scene, this.physics.world); break;
            case 'chua': this.currentLevel = new chua(this.scene, this.physics.world); break;
        }
    }

    handleCollect(item) {
        item.collected = true;
        item.model.visible = false;
        const colorHex = item.model.material.color.getHex();
        this.ui.activateSlot(this.collected.length, colorHex);
        this.collected.push(item);

        if (this.collected.length >= 3) {
            if (this.grayscalePass) this.grayscalePass.enabled = false;
            this.isTransitioning = true;
            this.player.target = null;
            if (this.player.body) this.player.body.velocity.set(0, 0, 0);

            setTimeout(() => {
                this.showNextMapHub();
            }, 1500); 
        }
    }

    showNextMapHub() {
        const hub = document.createElement('div');
        hub.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            padding: 2.5rem; background: rgba(255, 255, 255, 0.95);
            border: 4px solid #ffdd00; border-radius: 20px; text-align: center;
            z-index: 10000; font-family: sans-serif;
        `;
        hub.innerHTML = `
            <h2 style="color: #333; margin: 0;">🌈 THẾ GIỚI ĐÃ HỒI SINH!</h2>
            <button id="btn-next-level" style="margin-top: 20px; padding: 10px 30px; background: #ffdd00; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">TIẾP TỤC</button>
        `;
        document.body.appendChild(hub);
        document.getElementById('btn-next-level').onclick = () => {
            hub.remove();
            this.isTransitioning = false;
            this.checkLevelComplete();
        };
    }

    _getSpawnPoint() {
    switch (this.levelName) {
        case 'Map01': return { x: -18, y: 3, z: 20 };
        case 'Vm':    return { x: 0,   y: 2, z: 21 };
        case 'chua':  return { x: 0,   y: 2, z: 35 };
        default:      return { x: 0,   y: 2, z: 0  };
    }
}

    _triggerItemQuiz(item) {
        this.isQuizOpen = true;
        this.player.target = null;
        if (this.player.body) {
            this.player.body.velocity.x = 0;
            this.player.body.velocity.y = 0;
            this.player.body.velocity.z = 0;
        }

        const levelData = QUEST_DATA[this.levelName];
        const quizIndex = this.collected.length;
        const quiz = levelData?.itemQuizzes?.[quizIndex];

        if (!quiz) {
            this.isQuizOpen = false;
            this.handleCollect(item);
            return;
        }

        this.ui.showQuiz(
            quiz,
            // Đúng → collect
            () => {
                this.isQuizOpen = false;
                this.handleCollect(item);
            },
            // Sai → teleport về spawn
            () => {
                this.isQuizOpen = false;
                const spawn = this._getSpawnPoint();

                this.collected=[]; // reset collect về 0
                this.ui.reset(); // xóa các slot màu trên UI

                if (this.currentLevel?.colorItems){
                    this.currentLevel.colorItems.forEach(item=>{
                        item.collected=false; //reset trạng thái collect của item
                        item.model.visible=true; // hiện lại item trên map
                    });
                }

                this.player.body.position.x = spawn.x;
                this.player.body.position.y = spawn.y;
                this.player.body.position.z = spawn.z;

                this.player.body.velocity.x = 0;
                this.player.body.velocity.y = 0;
                this.player.body.velocity.z = 0;
                this.player.body.angularVelocity.x = 0;
                this.player.body.angularVelocity.y = 0;
                this.player.body.angularVelocity.z = 0;

                this.player.body.wakeUp();
                this.player.mesh.position.copy(this.player.body.position);
                this.player.target = null;

                if (this.grayscalePass)this.grayscalePass.enabled=true; // bật lại grayscale
            }
        );
    }

    checkLevelComplete() {
        if (this.collected.length < 3 || this.isTransitioning) return;
        if (this.levelName === 'Map01') this.transitionTo('Vm', 0, 2, 21);
        else if (this.levelName === 'Vm') this.transitionTo('chua', 0, 2, 35);
        else if (this.levelName === 'chua') this.showWinScreen();
    }

    transitionTo(level, spawnX, spawnY, spawnZ) {
        this.isTransitioning = true;
        const flash = document.createElement('div');
        flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;transition:opacity 0.8s ease;z-index:9999;`;
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '1'; }, 100);

        setTimeout(() => {
            this.loadLevel(level);
            this.player.body.position.set(spawnX, spawnY, spawnZ);
            this.player.body.velocity.set(0, 0, 0);
            this.player.target = null;
            this.isDead = false;
            flash.style.opacity = '0';
            setTimeout(() => {
                if(flash.parentNode) document.body.removeChild(flash);
                this.isTransitioning = false;
            }, 800);
        }, 1000);
    }

    // Thay toàn bộ hàm checkItemCollision
    checkItemCollision() {
        if (this.levelName === 'Gate' || !this.currentLevel?.colorItems || this.isTransitioning) return;
        if (this.isQuizOpen) return; // đang quiz thì không check tiếp

        const playerPos = this.player.body.position;
        this.currentLevel.colorItems.forEach((item) => {
            if (item.collected) return;
            item.model.getWorldPosition(this._tempV3);
            const distXZ = Math.sqrt(
                Math.pow(playerPos.x - this._tempV3.x, 2) +
                Math.pow(playerPos.z - this._tempV3.z, 2)
            );
            if (distXZ < 1.2 && Math.abs(playerPos.y - this._tempV3.y) < 2) {
                this._triggerItemQuiz(item);
            }
        });
    }

    checkPortalTrigger() {
        if (this.levelName !== 'Gate' || this.isTransitioning || !this.currentLevel?.portalTrigger) return;
        const playerPos = this.player.body.position;
        const pt = this.currentLevel.portalTrigger;
        if (Math.abs(playerPos.x - pt.x) < pt.width/2 && Math.abs(playerPos.z - pt.z) < pt.depth/2) {
            this.transitionTo('Map01', -18, 3, 20);
        }
    }

    checkWaterDeath() {
        if (this.levelName !== 'Map01' || this.isDead || !this.player.alive) return;
        const playerPos = this.player.body.position;
        if (playerPos.y < -2) { this.triggerDeath(); return; }
        const raycaster = new THREE.Raycaster(new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z), new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(this.currentLevel.landMeshes || [], false);
        if (intersects.length > 0 && intersects[0].object.userData.isWater && intersects[0].distance < 1.2) {
            this.triggerDeath();
        }
    }

    triggerDeath() {
        if (this.isDead) return;
        this.isDead = true;
        this.player.alive = false;
        this.player.target = null;
        this.showDeathScreen();
    }

    showDeathScreen() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;`;
        overlay.innerHTML = `<h2>Bạn đã ngã xuống nước!</h2><button id="btn-retry" style="padding:10px 25px;background:#00ddff;border:none;cursor:pointer;">THỬ LẠI</button>`;
        document.body.appendChild(overlay);
        document.getElementById('btn-retry').onclick = () => {
            overlay.remove();
            this.isDead = false;
            this.loadLevel('Map01');
            this.player.alive = true;
            this.player.body.position.set(-18, 3, 20);
        };
    }

    showWinScreen() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:9999;color:white;`;
        overlay.innerHTML = `<h2>CHIẾN THẮNG!</h2><button id="btn-win" style="padding:10px 30px;background:#ffdd00;border:none;cursor:pointer;">CHƠI LẠI</button>`;
        document.body.appendChild(overlay);
        document.getElementById('btn-win').onclick = () => { location.reload(); };
    }

    clearScene() {
        const toRemove = [];
        this.scene.traverse((obj) => {
            if (this._persistentObjects.has(obj.uuid)) return;
            if (obj === this.scene || obj.parent !== this.scene) return;
            toRemove.push(obj);
        });
        toRemove.forEach(obj => this.scene.remove(obj));
    }

    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;
        const viewSize = 20;
        this.camera.left = -viewSize * aspect;
        this.camera.right = viewSize * aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
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
        if (this.composer) this.composer.render();
        else this.renderer.render(this.scene, this.camera);
    }
}