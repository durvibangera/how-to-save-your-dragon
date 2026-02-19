import * as THREE from "three";

/**
 * Cinematic third-person flight camera with smooth interpolation,
 * dynamic banking, subtle sway, and per-area atmosphere feel.
 */
export class CameraController {
  constructor(camera, curve) {
    this.camera = camera;
    this.curve = curve;
    this.heightOffset = 6;
    this.followDistance = 0.012;
    this.smoothPosition = new THREE.Vector3();
    this.smoothLookAt = new THREE.Vector3();
    this.initialized = false;
    this.shake = 0;
    this.baseFov = 65;
    this.targetFov = 65;
  }

  update(progress, delta, dragonWorldPos = null, dragonForward = null) {
    // Use track fallback if no dragon position yet
    if (!dragonWorldPos) {
      const t = Math.min(Math.max(progress, 0), 0.999);
      dragonWorldPos = this.curve.getPointAt(t);
      dragonForward = this.curve.getTangentAt(t);
    }

    // Camera sits behind and above the dragon
    const behind = dragonForward
      ? dragonForward.clone().negate()
      : new THREE.Vector3(0, 0, 1);
    const cameraTarget = dragonWorldPos.clone()
      .addScaledVector(behind, 18)
      .add(new THREE.Vector3(0, this.heightOffset, 0));

    // Multi-frequency cinematic sway
    const now = Date.now();
    const sway = Math.sin(now * 0.0006) * 0.25 + Math.sin(now * 0.0012) * 0.12;
    const lateralDrift = Math.sin(now * 0.0004) * 0.15;
    cameraTarget.y += sway;
    cameraTarget.x += lateralDrift;

    // Look-at: dragon position (slightly above center)
    const lookAtTarget = dragonWorldPos.clone();
    lookAtTarget.y += 2.5;

    // Speed-based shake
    const shakeAmount = this.shake * 0.08;
    if (shakeAmount > 0.01) {
      cameraTarget.x += Math.sin(now * 0.011) * shakeAmount;
      cameraTarget.y += Math.cos(now * 0.014) * shakeAmount * 0.5;
      cameraTarget.z += Math.sin(now * 0.009) * shakeAmount * 0.3;
    }

    // Dynamic FOV — widen slightly when going fast
    this.targetFov = this.baseFov + this.shake * 2;
    this.camera.fov += (this.targetFov - this.camera.fov) * 0.03;
    this.camera.updateProjectionMatrix();

    if (!this.initialized) {
      this.smoothPosition.copy(cameraTarget);
      this.smoothLookAt.copy(lookAtTarget);
      this.initialized = true;
    }

    // Smooth position/look interpolation
    const posLerp = 0.055 + this.shake * 0.003;
    const lookLerp = 0.075 + this.shake * 0.003;
    this.smoothPosition.lerp(cameraTarget, posLerp);
    this.smoothLookAt.lerp(lookAtTarget, lookLerp);

    this.camera.position.copy(this.smoothPosition);
    this.camera.lookAt(this.smoothLookAt);

    // Banking roll when turning
    if (dragonForward) {
      const camFwd = new THREE.Vector3();
      this.camera.getWorldDirection(camFwd);
      const cross = new THREE.Vector3().crossVectors(camFwd, dragonForward);
      const roll = THREE.MathUtils.clamp(cross.y * 3, -0.15, 0.15);
      this.camera.rotation.z += (roll - this.camera.rotation.z * 0.1) * 0.04;
    }
  }

  setShake(amount) {
    this.shake = amount;
  }
}
