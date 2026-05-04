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
        this.colorItems = [];
        this.loadMap();
    }

    loadMap() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(modelUrl, (gltf) => {
            const model = gltf.scene;
            // Scale map theo yêu cầu của mày
            model.scale.set(0.7, 0.7, 0.7);
            model.position.set(0, 0, 0); 
            
            model.traverse((obj) => {
                if (obj.isMesh) {
                    obj.castShadow = true;
                    obj.receiveShadow = true;
                }
            });
            this.scene.add(model);

            // Tạo các khối va chạm và vật phẩm
            this.createManualFloors();
            this.createColorItems();
            
            console.log("✅ Map 01 Loaded: Items placed at Tower and Bridge.");
        });
    }

    createManualFloors() {
        const floorData = [
            { 
                name: "Ụ đất", 
                size: { x: 65, y: 6, z: 40 }, 
                pos:  { x: -2, y: 0, z: 50 } 
            },
            { 
                name: "Cầu", 
                size: { x: 8, y: 9, z: 50 }, 
                pos:  { x: -4.5, y: 0, z: 0 }
            },
            { 
                name: "Tháp", 
                size: { x: 60, y: 6, z: 63 }, 
                pos:  { x: -1, y: 0, z: -75 } 
            }
        ];

    floorData.forEach(data => {
            // 1. Mesh tàng hình để Raycast click di chuyển
            const geo = new THREE.BoxGeometry(data.size.x, 0.2, data.size.z);
            const mat = new THREE.MeshBasicMaterial({ visible: false, wireframe: false }); //tạo vật liệu cho floor 
            const mesh = new THREE.Mesh(geo, mat); // tạo thành object trong game
            
            // Chuyển đổi tọa độ Blender sang Three.js (nhân scale 0.7)
            mesh.position.set(data.pos.x * 0.7, data.pos.y * 0.7, data.pos.z * 0.7); // đặt vị trí cho file blender
            mesh.userData.isWalkable = true;
            this.scene.add(mesh);
            this.landMeshes.push(mesh);

            // 2. Vật lý Cannon-es để nhân vật đứng được trên sàn
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
        });
    }

    createColorItems() {
        const locations = [
            { name: "Trung tâm tháp", x: 20, y: 0, z: -70, color: 0xff0000 }, 
            { name: "Rìa tháp", x: 5, y: 0, z: -72.8, color: 0x00ff00 }, 
            { name: "Trên cầu", x: -5.5, y: 0.5, z: -6, color: 0xffff00 } 
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
            
            mesh.position.set(loc.x * 0.7, loc.y * 0.7, loc.z * 0.7);
            
            // Gán tên vào userData để Game.js nhận diện được
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
        // remove model
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

        // remove physics bodies
        if (this.bodies) {
            this.bodies.forEach(body => world.removeBody(body));
        }

        // clear data
        this.landMeshes = [];
        this.colorItems = [];
    }
}