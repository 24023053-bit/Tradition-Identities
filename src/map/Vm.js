import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import modelUrl from '../assets/vm.glb?url';

export class Vm {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.model = null;
        this.landMeshes = [];
        this.colorItems = [];
        this.bodies = [];

        this.loadMap();
    }

    loadMap() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            modelUrl,
            (gltf) => {
                this.model = gltf.scene;
                this.model.scale.set(1.5, 1.5, 1.5);
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

                console.log("✅ Vm loaded");
            },
            undefined,
            (error) => {
                console.error("❌ Lỗi load Vm:", error);
            }
        );
    }

    createManualFloors() {
        // ⚠️ Chỉnh các giá trị pos/size cho khớp với model vm.glb
        // Tọa độ là Blender-space, sẽ nhân 0.7 khi set vào Three.js
        const floorData = [
            {
                name: "Sân trước",
                size: { x: 60, y: 6, z: 40 },
                pos:  { x: 0,  y: 0, z: 30 }
            },
            {
                name: "Sân chính",
                size: { x: 60, y: 6, z: 60 },
                pos:  { x: 0,  y: 0, z: -10 }
            },
            {
                name: "Sân sau",
                size: { x: 60, y: 6, z: 40 },
                pos:  { x: 0,  y: 0, z: -55 }
            }
        ];

        floorData.forEach(data => {
            // Mesh tàng hình để raycast click di chuyển
            const geo = new THREE.BoxGeometry(data.size.x * 0.7, 0.2, data.size.z * 0.7);
            const mat = new THREE.MeshBasicMaterial({ visible: false });
            const mesh = new THREE.Mesh(geo, mat);

            mesh.position.set(data.pos.x * 0.7, data.pos.y * 0.7, data.pos.z * 0.7);
            mesh.userData.isWalkable = true;

            this.scene.add(mesh);
            this.landMeshes.push(mesh);

            // Physics body để nhân vật đứng được
            const shape = new CANNON.Box(new CANNON.Vec3(
                (data.size.x * 0.7) / 2,
                0.1,
                (data.size.z * 0.7) / 2
            ));

            const body = new CANNON.Body({ mass: 0, shape: shape });
            body.position.copy(mesh.position);
            this.world.addBody(body);
            this.bodies.push(body);
        });
    }

    createColorItems() {
        // ⚠️ Chỉnh tọa độ x/y/z cho item nằm đúng trên map vm.glb
        // Tọa độ Blender-space, nhân 0.7 khi set vào Three.js
        const locations = [
            { name: "Khu giữa",   x:  10, y: 0, z: -10, color: 0xff0088 },
            { name: "Khu sau",    x: -10, y: 0, z: -50, color: 0x00ffff },
            { name: "Sân trước",  x:   5, y: 0, z:  0, color: 0xffff44 }
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

            mesh.position.set(loc.x * 0.7, loc.y * 0.7 + 0.8, loc.z * 0.7);
            mesh.userData.name = loc.name;

            this.scene.add(mesh);
            this.colorItems.push({
                model: mesh,
                collected: false,
                name: loc.name
            });
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
        this.bodies.forEach(b => world.removeBody(b));

        this.landMeshes = [];
        this.colorItems = [];
        this.bodies = [];
    }
}