// Gate.js

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import modelUrl from '../assets/cổng.glb?url';

export class Gate {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        this.landMeshes = [];
        this.model = null;

        // trigger đúng khe giữa cổng
        this.portalTrigger = {
            x: -10,
            z: 0,
            width: 70, depth: 0.3,
        };

        this.createFloor();
        this.createDebugTrigger();
        this.loadGate();
    }

    createFloor() {
        // sàn vật lý đúng mặt đất
        const floorShape = new CANNON.Box(
            new CANNON.Vec3( 50, 0.5, 50)
        );

        const floorBody = new CANNON.Body({
            mass: 0,
            shape: floorShape
        });

        // đặt ngay mặt đất
        floorBody.position.set(0, -0.2, 0);

        this.world.addBody(floorBody);
        this.floorBody = floorBody;
    }

    createDebugTrigger() {
        const geometry = new THREE.BoxGeometry(this.portalTrigger.width,2,this.portalTrigger.depth);

        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true
        });

        const debugBox = new THREE.Mesh(
            geometry,
            material
        );

        debugBox.position.set(
            this.portalTrigger.x,
            1,
            this.portalTrigger.z
        );
    }

    loadGate() {
        const dracoLoader = new DRACOLoader();

        dracoLoader.setDecoderPath(
            'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
        );

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        loader.load(
            modelUrl,

            (gltf) => {
                this.model = gltf.scene;

                this.model.scale.set(2.5, 2.5, 2.5);

                // đặt cổng giữa map
                this.model.position.set(0,18,0);

                this.model.traverse((obj) => {
                    if (obj.isMesh) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;

                        this.landMeshes.push(obj);
                    }
                });

                this.scene.add(this.model);

                console.log(
                    '✅ Gate loaded thành công'
                );
            },

            (xhr) => {
                if (xhr.total > 0) {
                    console.log(
                        'Gate Loading: ' +
                        Math.round(
                            (xhr.loaded / xhr.total) * 100
                        ) + '%'
                    );
                }
            },

            (error) => {
                console.error(
                    '❌ Lỗi load Gate:',
                    error
                );
            }
        );
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

    resetItems() {
        console.log(
            'Gate không có item để reset.'
        );
    }
}