// Player.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import modelUrl from '../assets/Nvat.glb?url';

export class Player {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.alive = true;
        this.target = null;
        this.mixer = null;       // Animation mixer
        this.actionIdle = null;  // Animation idle
        this.actionWalk = null;  // Animation walk
        this.currentAction = null;

        // Physics body — giữ nguyên box collision
        this.body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(0.4, 0.5, 0.4)),
            linearDamping: 0.9,
            fixedRotation: true
        });

        this.body.position.set(-18, 0.8, 20);
        this.world.addBody(this.body);

        // Mesh group — dùng làm placeholder trước khi GLB load xong
        this.mesh = new THREE.Group();
        this.scene.add(this.mesh);

        // Load GLB model
        this.loadModel();
    }

    loadModel() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            modelUrl,
            (gltf) => {
                const model = gltf.scene;

                // Chỉnh scale cho phù hợp — thay đổi nếu nhân vật quá to/nhỏ
                model.scale.set(0.5, 0.5, 0.5);

                // Offset xuống để chân chạm đất (chỉnh nếu cần)
                model.position.set(0, -0.5, 0);

                model.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });

                this.mesh.add(model);

                // Setup animation nếu GLB có animation clips
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(model);

                    // Tìm clip theo tên — đổi tên nếu cần
                    const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle')
                        || gltf.animations[0];
                    const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'Walk')
                        || gltf.animations[1]
                        || gltf.animations[0];

                    this.actionIdle = this.mixer.clipAction(idleClip);
                    this.actionWalk = this.mixer.clipAction(walkClip);

                    // Bắt đầu với idle
                    this.actionIdle.play();
                    this.currentAction = this.actionIdle;

                    console.log("🎬 Animations:", gltf.animations.map(a => a.name));
                }

                console.log("✅ Player model loaded");
            },
            undefined,
            (error) => {
                console.error("❌ Lỗi load Player model:", error);

                // Fallback: dùng cube nếu load lỗi
                const fallback = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8, 1, 0.8),
                    new THREE.MeshStandardMaterial({ color: 0x00ddff })
                );
                fallback.castShadow = true;
                this.mesh.add(fallback);
            }
        );
    }

    // Chuyển animation mượt mà
    playAnimation(action) {
        if (!action || action === this.currentAction) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(0.2);
        }

        action.reset().fadeIn(0.2).play();
        this.currentAction = action;
    }

    setTarget(x, z) {
        this.target = new THREE.Vector2(x, z);
    }

    update(delta) {
        if (!this.alive) return;

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        if (this.target) {
            const dx = this.target.x - this.body.position.x;
            const dz = this.target.y - this.body.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist > 0.3) {
                const speed = 30;
                this.body.velocity.x = (dx / dist) * speed;
                this.body.velocity.z = (dz / dist) * speed;

                // Xoay nhân vật theo hướng di chuyển
                this.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;

                // Chuyển sang animation walk
                if (this.actionWalk) this.playAnimation(this.actionWalk);
            } else {
                this.body.velocity.x = 0;
                this.body.velocity.z = 0;
                this.target = null;

                // Chuyển về idle
                if (this.actionIdle) this.playAnimation(this.actionIdle);
            }
        } else {
            // Đứng yên → idle
            if (this.actionIdle && this.currentAction !== this.actionIdle) {
                this.playAnimation(this.actionIdle);
            }
        }

        // Sync mesh với physics body
        this.mesh.position.copy(this.body.position);
    }

    isDead() {
        if (this.body.position.y < -2) {
            this.alive = false;
            return true;
        }
        return false;
    }

    reset() {
        this.alive = true;
        this.target = null;
        this.body.position.set(-18, 2, 20);
        this.body.velocity.set(0, 0, 0);
        this.body.angularVelocity.set(0, 0, 0);
    }
}