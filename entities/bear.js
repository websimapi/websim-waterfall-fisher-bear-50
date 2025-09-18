import * as THREE from 'three';

export const BEAR_X_LIMIT = 3.5;
const BEAR_MOVE_SPEED = 0.08;
const BEAR_WOBBLE_AMOUNT = 0.2;

// Material definitions
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

export function createBear(type = 'splashy') {
    console.log(`[Bear V3] Creating bear of type: ${type}`);
    
    const bearGroup = new THREE.Group();
    bearGroup.name = 'bear-character';
    
    // Get materials
    const materials = MATERIALS[type] || MATERIALS.splashy;
    const bodyMat = materials.body.clone();
    const accentMat = materials.accent.clone();
    
    // Store parts for easy access
    bearGroup.bodyParts = {};
    
    // Helper function to create and add a part
    function addPart(name, geometry, material, position = {x:0, y:0, z:0}) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = name;
        mesh.position.set(position.x, position.y, position.z);
        bearGroup.add(mesh);
        bearGroup.bodyParts[name] = mesh;
        console.log(`[Bear V3] Created and added ${name} at position (${position.x}, ${position.y}, ${position.z})`);
        return mesh;
    }
    
    // Create body parts
    addPart('torso', new THREE.BoxGeometry(1.5, 1.5, 1), bodyMat, {x: 0, y: 0, z: 0});
    addPart('head', new THREE.BoxGeometry(1, 1, 1), bodyMat, {x: 0, y: 1.25, z: 0});
    addPart('leftEar', new THREE.BoxGeometry(0.3, 0.3, 0.3), accentMat, {x: -0.4, y: 1.9, z: 0});
    addPart('rightEar', new THREE.BoxGeometry(0.3, 0.3, 0.3), accentMat, {x: 0.4, y: 1.9, z: 0});
    addPart('snout', new THREE.BoxGeometry(0.5, 0.4, 0.3), accentMat, {x: 0, y: 1.1, z: 0.5});
    addPart('leftLeg', new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMat, {x: -0.5, y: -1, z: 0});
    addPart('rightLeg', new THREE.BoxGeometry(0.5, 0.5, 0.5), bodyMat, {x: 0.5, y: -1, z: 0});
    
    // Create arms with pivots - this is the fish-holding arm (bear's right, screen left)
    const rightArmPivot = new THREE.Group();
    rightArmPivot.name = 'rightArmPivot';
    rightArmPivot.position.set(-0.95, 0.1, -0.3);
    rightArmPivot.rotation.z = -Math.PI / 16;
    
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), bodyMat);
    rightArm.name = 'rightArm';
    rightArm.position.set(0, 0, 0);
    rightArmPivot.add(rightArm);
    bearGroup.add(rightArmPivot);
    bearGroup.bodyParts.rightArmPivot = rightArmPivot;
    bearGroup.bodyParts.rightArm = rightArm;
    console.log('[Bear V3] Created right arm pivot (fish-holding arm)');
    
    // Left arm
    const leftArmPivot = new THREE.Group();
    leftArmPivot.name = 'leftArmPivot';
    leftArmPivot.position.set(0.95, 0.1, -0.3);
    leftArmPivot.rotation.z = Math.PI / 16;
    
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.4), bodyMat);
    leftArm.name = 'leftArm';
    leftArm.position.set(0, 0, 0);
    leftArmPivot.add(leftArm);
    bearGroup.add(leftArmPivot);
    bearGroup.bodyParts.leftArmPivot = leftArmPivot;
    bearGroup.bodyParts.leftArm = leftArm;
    console.log('[Bear V3] Created left arm pivot');
    
    // Net collision area
    const netGroup = new THREE.Group();
    netGroup.name = 'net-group';
    const netMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    netMaterial.visible = false;
    const net = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.1), netMaterial);
    net.name = 'net';
    net.position.set(0, -1.3, -0.7);
    netGroup.add(net);
    bearGroup.add(netGroup);
    console.log('[Bear V3] Added net collision area');
    
    // Set up user data and methods
    bearGroup.userData = {
        net: net,
        netWidth: 2.2,
        targetX: 0,
        wobbleTimer: 0,
        isMovingWithKeys: false
    };
    
    // Method to get the fish-holding hand
    bearGroup.getFishHoldingHand = function() {
        return this.bodyParts.rightArmPivot;
    };
    
    // Set initial position and rotation
    bearGroup.position.set(0, 4.65, 0.8);
    bearGroup.rotation.y = Math.PI; // Face camera
    
    console.log('[Bear V3] Bear creation complete with all parts');
    return bearGroup;
}

export function updateBear(bear, moveDirection) {
    if (!bear || !bear.userData) return;
    
    // Handle movement
    if (moveDirection !== 0 && bear.userData.isMovingWithKeys) {
        bear.userData.targetX = THREE.MathUtils.clamp(
            bear.position.x + moveDirection, 
            -BEAR_X_LIMIT, 
            BEAR_X_LIMIT
        );
    }
    
    // Smooth movement towards target
    const oldX = bear.position.x;
    const distanceToTarget = bear.userData.targetX - bear.position.x;
    const moveThisFrame = Math.sign(distanceToTarget) * Math.min(Math.abs(distanceToTarget), BEAR_MOVE_SPEED);
    
    if (Math.abs(distanceToTarget) > 0.01) {
        bear.position.x += moveThisFrame;
    }
    
    // Wobble animation when moving
    const velocityX = bear.position.x - oldX;
    if (Math.abs(velocityX) > 0.001) {
        bear.userData.wobbleTimer += 0.2;
        bear.rotation.z = Math.sin(bear.userData.wobbleTimer) * BEAR_WOBBLE_AMOUNT;
    } else {
        bear.rotation.z = THREE.MathUtils.lerp(bear.rotation.z, 0, 0.1);
    }
}