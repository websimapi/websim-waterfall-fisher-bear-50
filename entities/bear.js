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

function createVoxel(x, y, z, w, h, d, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    return mesh;
}

export function createBear(type = 'splashy') {
    console.log(`[Verbose Bear] Creating bear of type: ${type}`);
    const group = new THREE.Group();
    group.name = 'bear-character';

    const { bodyMat, accentMat } = getBearMaterials(type);

    const bodyParts = {};

    // Body
    bodyParts.torso = createVoxel(0, 0, 0, 1.5, 1.5, 1, bodyMat);
    bodyParts.torso.name = 'torso';

    // Head & Face
    bodyParts.head = createVoxel(0, 1.25, 0, 1, 1, 1, bodyMat);
    bodyParts.head.name = 'head';
    bodyParts.leftEar = createVoxel(-0.4, 1.9, 0, 0.3, 0.3, 0.3, accentMat);
    bodyParts.leftEar.name = 'leftEar';
    bodyParts.rightEar = createVoxel(0.4, 1.9, 0, 0.3, 0.3, 0.3, accentMat);
    bodyParts.rightEar.name = 'rightEar';
    bodyParts.snout = createVoxel(0, 1.1, 0.5, 0.5, 0.4, 0.3, accentMat);
    bodyParts.snout.name = 'snout';
    
    // Legs
    bodyParts.leftLeg = createVoxel(-0.5, -1, 0, 0.5, 0.5, 0.5, bodyMat);
    bodyParts.leftLeg.name = 'leftLeg';
    bodyParts.rightLeg = createVoxel(0.5, -1, 0, 0.5, 0.5, 0.5, bodyMat);
    bodyParts.rightLeg.name = 'rightLeg';

    // --- Arms Refactor with Pivots ---
    // Note: Arm names are swapped to be more intuitive from camera perspective after bear rotation.
    // 'leftArmPivot' is on the left side of the screen.
    const armY = 0.1, armZ = -0.3;
    const armWidth = 0.4, armHeight = 1.0, armDepth = 0.4;
    
    // Left Arm (on screen's left, bear's right)
    const leftArmPivot = new THREE.Group();
    leftArmPivot.name = 'leftArmPivot';
    leftArmPivot.position.set(0.95, armY, armZ);
    leftArmPivot.rotation.z = Math.PI / 16;
    const leftArmMesh = createVoxel(0, 0, 0, armWidth, armHeight, armDepth, bodyMat);
    leftArmMesh.name = 'leftArm';
    leftArmPivot.add(leftArmMesh);
    bodyParts.leftArmPivot = leftArmPivot;
    console.log('[Verbose Bear] Created left arm with pivot. Mesh:', leftArmMesh);
    
    // Right Arm (on screen's right, bear's left)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.name = 'rightArmPivot';
    rightArmPivot.position.set(-0.95, armY, armZ);
    rightArmPivot.rotation.z = -Math.PI / 16;
    const rightArmMesh = createVoxel(0, 0, 0, armWidth, armHeight, armDepth, bodyMat);
    rightArmMesh.name = 'rightArm';
    rightArmPivot.add(rightArmMesh);
    bodyParts.rightArmPivot = rightArmPivot;
    console.log('[Verbose Bear] Created right arm with pivot. Mesh:', rightArmMesh);
    
    // Add all parts to the main group
    for (const partName in bodyParts) {
        const part = bodyParts[partName];
        console.log(`[Verbose Bear] Adding part: ${partName}`, part);
        group.add(part);
    }
    
    group.position.set(0, 4.65, 0.8);
    group.rotation.y = Math.PI;
    group.userData.targetX = 0;
    group.userData.wobbleTimer = 0;
    
    // Create a separate group for the net to isolate it
    const netGroup = new THREE.Group();
    netGroup.name = 'net-group';
    group.add(netGroup);

    const netWidth = 2.2;
    const netMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    netMaterial.visible = false; // The net is for collision, not for display
    
    const net = new THREE.Mesh(new THREE.BoxGeometry(netWidth, 0.6, 0.1), netMaterial);
    net.name = 'net';
    net.position.set(0, -1.3, -0.7);
    netGroup.add(net);
    console.log('[Verbose Bear] Added net to its own group inside the bear.');
    
    group.userData.net = net;
    group.userData.netWidth = netWidth;
    
    console.log('[Verbose Bear] Bear creation complete. Returning group.');
    return group;
}

export function updateBear(bear, moveDirection) {
    if (moveDirection !== 0 && bear.userData.isMovingWithKeys) {
        bear.userData.targetX = THREE.MathUtils.clamp(bear.position.x + moveDirection, -BEAR_X_LIMIT, BEAR_X_LIMIT);
    }
    const oldX = bear.position.x;
    const distanceToTarget = bear.userData.targetX - bear.position.x;
    const moveThisFrame = Math.sign(distanceToTarget) * Math.min(Math.abs(distanceToTarget), BEAR_MOVE_SPEED);
    if (Math.abs(distanceToTarget) > 0.01) {
        bear.position.x += moveThisFrame;
    }

    const velocityX = bear.position.x - oldX;
    if (Math.abs(velocityX) > 0.001) {
        bear.userData.wobbleTimer += 0.2;
        bear.rotation.z = Math.sin(bear.userData.wobbleTimer) * BEAR_WOBBLE_AMOUNT;
    } else {
        bear.rotation.z = THREE.MathUtils.lerp(bear.rotation.z, 0, 0.1);
    }
}