import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import modelUrl from '../assets/chua.glb?url';

// wireframe debug
const DEBUG = false;

export class chua {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.model = null;
        this.landMeshes = [];
        this.colorItems = [];
        this.bodies = [];
        this.debugMeshes = [];

        this.loadMap();
    }

    loadMap() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(modelUrl, (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(0.7, 0.7, 0.7);
            this.model.position.set(0, 0, 0);
            this.model.traverse((obj) => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            this.scene.add(this.model);
            this.createManualFloors();
            this.createColorItems();
            console.log("✅ chua loaded");
        }, undefined, (e) => console.error("❌", e));
    }

    addFloor({ sx, sz, px, py, pz, color = 0x00ff00 }) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(sx, 0.2, sz),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        mesh.position.set(px, py, pz);
        mesh.userData.isWalkable = true;
        this.scene.add(mesh);
        this.landMeshes.push(mesh);

        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(sx / 2, 0.1, sz / 2))
        });
        body.position.set(px, py, pz);
        this.world.addBody(body);
        this.bodies.push(body);

        if (DEBUG) {
            const dbg = new THREE.Mesh(
                new THREE.BoxGeometry(sx, 0.2, sz),
                new THREE.MeshBasicMaterial({ color, wireframe: true })
            );
            dbg.position.set(px, py, pz);
            this.scene.add(dbg);
            this.debugMeshes.push(dbg);
        }
    }

    // Ramp nghiêng theo trục Z (dùng cho cầu thang hướng X)
    addRamp({ sx, sz, px, py, pz, angleRad, color = 0xff8800 }) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(sx, 0.2, sz),
            new THREE.MeshBasicMaterial({ visible: true })
        );
        mesh.position.set(px, py, pz);
        mesh.rotation.z = angleRad;
        mesh.userData.isWalkable = true;
        this.scene.add(mesh);
        this.landMeshes.push(mesh);

        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Box(new CANNON.Vec3(sx / 2, 0.1, sz / 2))
        });
        body.position.set(px, py, pz);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angleRad));
        body.quaternion.set(q.x, q.y, q.z, q.w);
        this.world.addBody(body);
        this.bodies.push(body);

        if (DEBUG) {
            const dbg = new THREE.Mesh(
                new THREE.BoxGeometry(sx, 0.2, sz),
                new THREE.MeshBasicMaterial({ color, wireframe: true })
            );
            dbg.position.set(px, py, pz);
            dbg.rotation.z = angleRad;
            this.scene.add(dbg);
            this.debugMeshes.push(dbg);
        }
    }

    createManualFloors() {
        this.addFloor({
            sx: 250, sz: 200,
            px: 20, py: -26, pz: 0,   
            color: 0x00ff00
        });

        this.addRamp({
            sx: 100,      // chiều dài theo X
            sz: 7,    // chiều rộng theo Z
            px: -60,  py: -19,  pz: 0,   // ← dịch sang X-, y giữa dốc
            angleRad: 0.45,               // ← dốc lên về X+ (chiều đi lên chùa)
            color: 0xff8800
        });

        //tầng 2
        this.addFloor({
            sx: 40, sz: 40,y: 5, 
            px: 3, py: 0, pz: 0,    // ← hạ từ 10 xuống 3.5
            color: 0x0088ff
        });
    }

    createColorItems() {
        const locations = [
            { name: "Sân trái",  x: -75,  py: -26,  z:  5,  color: 0xff0088 }, // màu hồng
            { name: "Sàn chùa",  x:  10,  py: 1,  z: 2,  color: 0x00ffff }, // màu lam
            { name: "Sàn chùa",  x:  5,  py: 1, z:  -10,  color: 0xffff44 } // màu vàng
        ];

        locations.forEach(loc => {
            const mesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.6),
                new THREE.MeshStandardMaterial({
                    color: loc.color,
                    emissive: loc.color,
                    emissiveIntensity: 2
                })
            );
            mesh.position.set(loc.x, loc.py, loc.z);
            mesh.userData.name = loc.name;
            this.scene.add(mesh);
            this.colorItems.push({ model: mesh, collected: false, name: loc.name });
        });
    }

    dispose(scene, world) {
        if (this.model) {
            scene.remove(this.model);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
        }
        this.landMeshes.forEach(m => scene.remove(m));
        this.colorItems.forEach(item => scene.remove(item.model));
        this.debugMeshes.forEach(m => scene.remove(m));
        this.bodies.forEach(b => world.removeBody(b));
        this.landMeshes = [];
        this.colorItems = [];
        this.debugMeshes = [];
        this.bodies = [];
    }
}