import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import modelUrl from '../assets/biển18.glb?url';

export class Map01 {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.landMeshes = [];
        this.colorItems = []; // Mảng này sẽ được Game.js quét qua mỗi frame
        this.bodies = []; // Để quản lý dispose vật lý

        this.safezone={
            minY: -1
        };

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
            
            console.log("✅ Map 01 Loaded: Items ready for Quest.");
        });
    }

    createManualFloors() {
        const floorData = [
            { name: "Ụ đất", size: { x: 65, y: 6, z: 40 }, pos: { x: -2, y: 0, z: 50 } },
            { name: "Cầu", size: { x: 5, y: 9, z: 50 }, pos: { x: -3.5, y: 0, z: 0 } },
            { name: "Tháp", size: { x: 60, y: 6, z: 63 }, pos: { x: -1, y: 0, z: -75 } }
        ];

        floorData.forEach(data => {
            const geo = new THREE.BoxGeometry(data.size.x, 0.2, data.size.z);
            const mat = new THREE.MeshBasicMaterial({ visible: false }); 
            const mesh = new THREE.Mesh(geo, mat);
            
            mesh.position.set(data.pos.x * 0.7, data.pos.y * 0.7, data.pos.z * 0.7);
            mesh.userData.isWalkable = true;
            this.scene.add(mesh);
            this.landMeshes.push(mesh);

            const shape = new CANNON.Box(new CANNON.Vec3(
                (data.size.x * 0.7) / 2, 0.1, (data.size.z * 0.7) / 2
            ));
            const body = new CANNON.Body({ 
                mass: 0, 
                shape: shape,
                material: new CANNON.Material({ friction: 0 }) 
            });
            body.position.copy(mesh.position);
            this.world.addBody(body);
            this.bodies.push(body);
        });
    }

    createColorItems() {
        const locations = [
            { id: 0, name: "Trung tâm tháp", x: 20, y: 3, z: -70, color: 0xff0000 }, 
            { id: 1, name: "Rìa tháp", x: 5, y: 2, z: -72.8, color: 0x00ff00 }, 
            { id: 2, name: "Trên cầu", x: -5.5, y: 2, z: -6, color: 0xffff00 } 
        ];

        locations.forEach(loc => {
            const mesh = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.8), // Tăng nhẹ size để dễ nhìn
                new THREE.MeshStandardMaterial({ 
                    color: loc.color, 
                    emissive: loc.color, 
                    emissiveIntensity: 2 
                })
            );
            
            // Nâng y lên một chút (y: 2) để không bị chìm dưới sàn khi nhân scale 0.7
            mesh.position.set(loc.x * 0.7, loc.y * 0.7, loc.z * 0.7);
            this.scene.add(mesh);

            // Cấu trúc này phải khớp hoàn toàn với checkItemCollision trong Game.js
            this.colorItems.push({ 
                id: loc.id,
                model: mesh, 
                collected: false, 
                name: loc.name 
            });
        });
    }

    dispose() {
        if (this.model) {
            this.scene.remove(this.model);
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        }
        this.bodies.forEach(body => this.world.removeBody(body));
        this.landMeshes.forEach(mesh => this.scene.remove(mesh));
        this.colorItems.forEach(item => this.scene.remove(item.model));
    }
}