import * as THREE from "three";

let fpCamera = null;
let mainCamera = null;
let visualContext = null;
let fpActive = false;

// Controls state
const keys = { w: false, a: false, s: false, d: false, space: false };
let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.002;
const moveSpeed = 150;
const jumpForce = 60;
const gravity = -150;

let velocityY = 0;
let isGrounded = true;
const groundY = 35; // Bot/worker height

export function initFirstPerson(visual3d) {
  visualContext = visual3d;
  mainCamera = visual3d.camera;

  const rect = visual3d.containerEl.getBoundingClientRect();
  
  // Use 60 FOV for a natural human view without excessive edge distortion
  fpCamera = new THREE.PerspectiveCamera(60, rect.width / Math.max(rect.height, 1), 0.1, 4000);

  fpCamera.position.set(visual3d.worldWidth / 2, groundY, visual3d.worldHeight / 2 + 250);
  fpCamera.lookAt(visual3d.worldWidth / 2, 10, visual3d.worldHeight / 2 - 50);

  // Extract initial yaw and pitch from the lookAt
  const euler = new THREE.Euler().setFromQuaternion(fpCamera.quaternion, 'YXZ');
  yaw = euler.y;
  pitch = euler.x;

  // Keyboard controls
  window.addEventListener("keydown", (e) => {
    if (!fpActive) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = true;
    if (k === 'a' || k === 'arrowleft') keys.a = true;
    if (k === 's' || k === 'arrowdown') keys.s = true;
    if (k === 'd' || k === 'arrowright') keys.d = true;
    if (k === ' ') {
      keys.space = true;
      e.preventDefault(); // Prevent page scroll
    }
  });

  window.addEventListener("keyup", (e) => {
    if (!fpActive) return;
    const k = e.key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = false;
    if (k === 'a' || k === 'arrowleft') keys.a = false;
    if (k === 's' || k === 'arrowdown') keys.s = false;
    if (k === 'd' || k === 'arrowright') keys.d = false;
    if (k === ' ') keys.space = false;
  });

  // Mouse look
  window.addEventListener("mousemove", (e) => {
    if (!fpActive || document.pointerLockElement !== document.body) return;
    
    yaw -= e.movementX * mouseSensitivity;
    pitch -= e.movementY * mouseSensitivity;
    
    // Clamp pitch to avoid flipping
    const PI_2 = Math.PI / 2 - 0.05;
    pitch = Math.max(-PI_2, Math.min(PI_2, pitch));
    
    fpCamera.rotation.set(pitch, yaw, 0, 'YXZ');
  });

  // Re-lock pointer if player clicks canvas while in first person
  document.body.addEventListener("click", () => {
    if (fpActive && document.pointerLockElement !== document.body) {
      document.body.requestPointerLock();
    }
  });
}

export function enableFirstPerson() {
  if (!visualContext) return;
  visualContext.camera = fpCamera;
  fpActive = true;
  document.body.requestPointerLock();
}

export function disableFirstPerson() {
  if (!visualContext) return;
  visualContext.camera = mainCamera;
  fpActive = false;
  if (document.pointerLockElement === document.body) {
    document.exitPointerLock();
  }
  // Reset keys
  for (let k in keys) keys[k] = false;
}

export function resizeFirstPersonCamera(width, height) {
  if (fpCamera) {
    fpCamera.aspect = width / Math.max(height, 1);
    fpCamera.updateProjectionMatrix();
  }
}

export function updateFirstPerson(dt) {
  if (!fpActive || !fpCamera) return;

  // Calculate forward and right vectors based on yaw
  const fwX = -Math.sin(yaw);
  const fwZ = -Math.cos(yaw);
  
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  let moveX = 0;
  let moveZ = 0;

  if (keys.w) { moveX += fwX; moveZ += fwZ; }
  if (keys.s) { moveX -= fwX; moveZ -= fwZ; }
  if (keys.a) { moveX -= rightX; moveZ -= rightZ; }
  if (keys.d) { moveX += rightX; moveZ += rightZ; }

  // Normalize diagonal movement
  const length = Math.hypot(moveX, moveZ);
  if (length > 0.01) {
    moveX = (moveX / length) * moveSpeed * dt;
    moveZ = (moveZ / length) * moveSpeed * dt;
    fpCamera.position.x += moveX;
    fpCamera.position.z += moveZ;
  }

  // Jumping and Gravity
  if (keys.space && isGrounded) {
    velocityY = jumpForce;
    isGrounded = false;
  }

  velocityY += gravity * dt;
  fpCamera.position.y += velocityY * dt;

  // Ground collision check
  if (fpCamera.position.y <= groundY) {
    fpCamera.position.y = groundY;
    velocityY = 0;
    isGrounded = true;
  }
}