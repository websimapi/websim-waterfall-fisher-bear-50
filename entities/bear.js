import * as THREE from 'three';

// --- Material Management ---
// Centralized materials to ensure fresh clones and prevent state issues.
const MATERIALS = {
    splashy: {
        body: new THREE.MeshLambertMaterial({ color: 0x8d5524 }),
        accent: new THREE.MeshLambertMaterial({ color: 0x4a2d1e }),
    },
    grizzly: {
        body: new THREE.MeshLambertMaterial({ color: 0x6e4a2e }),
        accent: new THREE.MeshLambertMaterial({ color: 0x3b2818 }),
    }
};

function getBearMaterials(type) {
    const source = MATERIALS[type] || MATERIALS.splashy;
    console.log(`[Verbose Bear] Cloning materials for ${type} bear.`);
    return {
        bodyMat: source.body.clone(),
        accentMat: source.accent.clone(),
    };
}

export const BEAR_X_LIMIT = 3.5;
const BEAR_MOVE_SPEED = 0.08;
const BEAR_WOBBLE_AMOUNT = 0.2;

class Bear extends THREE.Group {
    constructor(type = 'splashy') {
        super();
        this.name = 'bear-character';
        console.log(`[Verbose Bear V2] Creating bear of type: ${type}`);

        const { bodyMat, accentMat } = getBearMaterials(type);

        this.bodyParts = {};

        const createPart = (geo, mat, name, pos = {x:0, y:0, z:0}) => {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.name = name;
            mesh.position.set(pos.x, pos.y, pos.z);
            this.bodyParts[name] = mesh;
            this.add(mesh);
            console.log(`[Verbose Bear V2] Created part: ${name}`);
            return mesh;
        };

        // --- GEOMETRIES ---
        const torsoGeo = new THREE.BoxGeometry(1.5, 1.5, 1);
        const headGeo = new THREE.BoxGeometry(1, 1, 1);
        const earGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const snoutGeo = new THREE.BoxGeometry(0.5, 0.4, 0.3);
        const legGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const armGeo = new THREE.BoxGeometry(0.4, 1.0, 0.4);

        // --- CREATE PARTS ---
        createPart(torsoGeo, bodyMat, 'torso');
        createPart(headGeo, bodyMat, 'head', { y: 1.25 });
        createPart(earGeo, accentMat, 'leftEar', { x: -0.4, y: 1.9 });
        createPart(earGeo, accentMat, 'rightEar', { x: 0.4, y: 1.9 });
        createPart(snoutGeo, accentMat, 'snout', { y: 1.1, z: 0.5 });
        createPart(legGeo, bodyMat, 'leftLeg', { x: -0.5, y: -1 });
        createPart(legGeo, bodyMat, 'rightLeg', { x: 0.5, y: -1 });

        // --- ARMS WITH PIVOTS ---
        // The bear is created facing forward (+Z). Anatomical right is -X, left is +X.
        // It's then rotated 180 deg to face the camera for gameplay.
        // So, the ANATOMICAL RIGHT arm (at -X) will be on the SCREEN'S LEFT. This is the one that holds the fish.
        const armY = 0.1, armZ = -0.3;

        // Anatomical RIGHT arm (on screen's LEFT after 180deg rotation)
        const rightArmPivot = new THREE.Group();
        rightArmPivot.name = 'rightArmPivot';
        rightArmPivot.position.set(-0.95, armY, armZ); // -X is anatomical right
        rightArmPivot.rotation.z = -Math.PI / 16;
        const rightArmMesh = new THREE.Mesh(armGeo, bodyMat);
        rightArmMesh.name = 'rightArm';
        rightArmPivot.add(rightArmMesh);
        this.add(rightArmPivot);
        this.bodyParts.rightArmPivot = rightArmPivot;
        console.log(`[Verbose Bear V2] Created ANATOMICAL RIGHT arm pivot (will be on screen's left in-game).`);

        // Anatomical LEFT arm (on screen's RIGHT after 180deg rotation)
        const leftArmPivot = new THREE.Group();
        leftArmPivot.name = 'leftArmPivot';
        leftArmPivot.position.set(0.95, armY, armZ); // +X is anatomical left
        leftArmPivot.rotation.z = Math.PI / 16;
        const leftArmMesh = new THREE.Mesh(armGeo, bodyMat);
        leftArmMesh.name = 'leftArm';
        leftArmPivot.add(leftArmMesh);
        this.add(leftArmPivot);
        this.bodyParts.leftArmPivot = leftArmPivot;
        console.log(`[Verbose Bear V2] Created ANATOMICAL LEFT arm pivot (will be on screen's right in-game).`);

        // --- NET (Collision Box) ---
        const netGroup = new THREE.Group();
        netGroup.name = 'net-group';
        const netWidth = 2.2;
        const netMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        netMaterial.visible = false;
        const net = new THREE.Mesh(new THREE.BoxGeometry(netWidth, 0.6, 0.1), netMaterial);
        net.name = 'net';
        net.position.set(0, -1.3, -0.7);
        netGroup.add(net);
        this.add(netGroup);
        console.log('[Verbose Bear V2] Added net group.');

        // --- USER DATA & INITIAL TRANSFORM ---
        this.userData.net = net;
        this.userData.netWidth = netWidth;
        this.userData.targetX = 0;
        this.userData.wobbleTimer = 0;
        this.userData.isMovingWithKeys = false;

        this.position.set(0, 4.65, 0.8);
        this.rotation.y = Math.PI; // Default to facing camera for gameplay

        console.log('[Verbose Bear V2] Bear creation complete.');
    }

    // Public method to get the correct hand for holding items
    getFishHoldingHand() {
        // The fish is held in the bear's anatomical right hand, which appears on the screen's left.
        return this.bodyParts.rightArmPivot; 
    }

    // Update logic for movement and animation
    updateAnimation(moveDirection) {
        if (moveDirection !== 0 && this.userData.isMovingWithKeys) {
            this.userData.targetX = THREE.MathUtils.clamp(this.position.x + moveDirection, -BEAR_X_LIMIT, BEAR_X_LIMIT);
        }

        const oldX = this.position.x;
        const distanceToTarget = this.userData.targetX - this.position.x;
        const moveThisFrame = Math.sign(distanceToTarget) * Math.min(Math.abs(distanceToTarget), BEAR_MOVE_SPEED);

        if (Math.abs(distanceToTarget) > 0.01) {
            this.position.x += moveThisFrame;
        }

        const velocityX = this.position.x - oldX;
        if (Math.abs(velocityX) > 0.001) {
            this.userData.wobbleTimer += 0.2;
            this.rotation.z = Math.sin(this.userData.wobbleTimer) * BEAR_WOBBLE_AMOUNT;
        } else {
            this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, 0, 0.1);
        }
    }
}

export function createBear(type = 'splashy') {
    return new Bear(type);
}

export function updateBear(bear, moveDirection) {
    // Make sure we are calling the method on our class instance
    if (bear instanceof Bear) {
        bear.updateAnimation(moveDirection);
    }
}