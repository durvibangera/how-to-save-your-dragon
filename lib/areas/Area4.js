import * as THREE from "three";
import { AreaBase } from "./AreaBase";
import { ProceduralTextures } from "../utils/ProceduralTextures";

/**
 * Area 4 - CLOUD KINGDOM
 * High altitude soaring above the clouds. Golden sun rays, floating islands, rainbow arcs, freedom.
 */
export class Area4 extends AreaBase {
  constructor(scene) {
    super(scene, 3);
    this.clouds = [];
    this.sunRays = [];
    this.islands = [];
  }

  populate() {
    // Cloud floor
    const cloudTex = ProceduralTextures.cloudTexture(128);
    this.addGround(0xddddee, -10, 200, cloudTex);
    this.addLight(0xffeedd, 3, 0, 35, -60);
    this.addLight(0xaaccff, 1.5, 10, 25, -40);

    // Cloud clusters - volumetric-ish
    for (let i = 0; i < 15; i++) {
      const cloud = this._createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 80,
        -6 + Math.random() * 10,
        this.baseZ - Math.random() * 120
      );
      cloud.scale.setScalar(0.7 + Math.random() * 2);
      this.group.add(cloud);
      this.clouds.push(cloud);
    }

    // Below-cloud layer
    for (let i = 0; i < 5; i++) {
      const bottomCloud = new THREE.Mesh(
        new THREE.SphereGeometry(8 + Math.random() * 12, 6, 4),
        new THREE.MeshStandardMaterial({
          color: 0xeeeeff, roughness: 1, transparent: true, opacity: 0.4,
          emissive: 0x334455, emissiveIntensity: 0.1,
        })
      );
      bottomCloud.scale.y = 0.2;
      bottomCloud.position.set(
        (Math.random() - 0.5) * 80,
        -12 + Math.random() * 3,
        this.baseZ - Math.random() * 120
      );
      this.group.add(bottomCloud);
      this.registerFloat(bottomCloud, 0.1, 0.3, i);
    }

    // Sun (radiant orb)
    const sunGroup = new THREE.Group();
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(5, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffee88 })
    );
    sunGroup.add(sun);

    // Sun corona
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(7, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffdd44, transparent: true, opacity: 0.15,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    sunGroup.add(corona);

    // Outer glow
    const outerGlow = new THREE.Mesh(
      new THREE.SphereGeometry(12, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffcc33, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    sunGroup.add(outerGlow);

    sunGroup.position.set(25, 40, this.baseZ - 50);
    this.group.add(sunGroup);

    // Sun light
    const sunLight = new THREE.PointLight(0xffeedd, 2, 100);
    sunLight.position.copy(sunGroup.position);
    this.group.add(sunLight);

    // Volumetric sun rays
    for (let i = 0; i < 4; i++) {
      const rayGeo = new THREE.PlaneGeometry(1.2, 40 + Math.random() * 15);
      const ray = new THREE.Mesh(
        rayGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffee66, transparent: true, opacity: 0.08 + Math.random() * 0.05,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ray.position.set(25 + (i - 3.5) * 3, 22, this.baseZ - 50);
      ray.rotation.z = (i - 3.5) * 0.12;
      this.group.add(ray);
      this.sunRays.push(ray);
    }

    // Floating rock islands with vegetation
    for (let i = 0; i < 4; i++) {
      const island = this._createFloatingIsland(i);
      island.position.set(
        (i % 2 === 0 ? -1 : 1) * (12 + Math.random() * 12),
        -2 + Math.random() * 8,
        this.baseZ - 15 - i * 18
      );
      this.group.add(island);
      this.islands.push(island);
      this.registerFloat(island, 0.15 + Math.random() * 0.1, 0.4 + Math.random() * 0.3, i * 1.2);
    }

    // Distant bird silhouettes
    for (let i = 0; i < 4; i++) {
      const bird = this._createBird();
      bird.position.set(
        (Math.random() - 0.5) * 60,
        15 + Math.random() * 20,
        this.baseZ - 20 - Math.random() * 80
      );
      bird.scale.setScalar(0.3 + Math.random() * 0.2);
      this.group.add(bird);
      this.registerFloat(bird, 0.3 + Math.random() * 0.2, 0.8, i * 0.7);
    }

    // Rainbow arc
    const rainbow = this._createRainbow();
    rainbow.position.set(-10, 5, this.baseZ - 70);
    this.group.add(rainbow);

    // Floating sparkle particles
    for (let i = 0; i < 15; i++) {
      const sparkle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.12 + Math.random() * 0.1, 0.9, 0.8),
          transparent: true, opacity: 0.6,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      sparkle.position.set(
        (Math.random() - 0.5) * 60,
        Math.random() * 20,
        this.baseZ - Math.random() * 110
      );
      this.group.add(sparkle);
      this.registerFloat(sparkle, 0.5 + Math.random() * 0.3, 0.5, Math.random() * Math.PI * 2);
    }

    const text = this.createTextSprite("Cloud Kingdom", "#ffeedd", 1.4);
    text.position.set(0, 16, this.baseZ - 30);
    this.group.add(text);
    this.floatText = text;
  }

  _createCloud() {
    const g = new THREE.Group();
    const cloudTex = ProceduralTextures.cloudTexture(128);
    const mat = new THREE.MeshStandardMaterial({
      map: cloudTex, color: 0xffffff, roughness: 1,
      emissive: 0x445566, emissiveIntensity: 0.08,
      transparent: true, opacity: 0.85,
    });
    const puffs = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < puffs; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(2 + Math.random() * 2.5, 6, 4),
        mat
      );
      puff.position.set(
        (Math.random() - 0.5) * 5,
        Math.random() * 1.5,
        (Math.random() - 0.5) * 4
      );
      puff.scale.y = 0.4 + Math.random() * 0.2;
      g.add(puff);
    }
    return g;
  }

  _createFloatingIsland(index) {
    const g = new THREE.Group();
    const stoneTex = ProceduralTextures.stoneTexture(64, [90, 80, 65]);

    // Rock base - more organic shape
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(3 + Math.random() * 2, 5 + Math.random() * 3, 6),
      new THREE.MeshStandardMaterial({
        map: stoneTex, color: 0x776655, roughness: 0.9,
        bumpMap: ProceduralTextures.bumpTexture(64), bumpScale: 0.3,
      })
    );
    rock.rotation.x = Math.PI;
    rock.castShadow = true;
    g.add(rock);

    // Side rocks
    const sideRock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1 + Math.random(), 0),
      new THREE.MeshStandardMaterial({ map: stoneTex, color: 0x665544, roughness: 0.92 })
    );
    sideRock.position.set((Math.random() - 0.5) * 3, -1, (Math.random() - 0.5) * 3);
    g.add(sideRock);

    // Grass top
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3.2, 0.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x55bb55, roughness: 0.92 })
    );
    top.position.y = 0.3;
    g.add(top);

    // Small tree on some
    if (index % 2 === 0) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 2.5, 6),
        new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
      );
      trunk.position.y = 1.85;
      g.add(trunk);
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x44aa44, roughness: 0.9 })
      );
      foliage.position.y = 3.5;
      g.add(foliage);
    }

    // Waterfall on some islands
    if (index % 3 === 1) {
      const waterfall = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 4),
        new THREE.MeshBasicMaterial({
          color: 0x88ccee, transparent: true, opacity: 0.3,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      waterfall.position.set(2, -2, 0);
      g.add(waterfall);
    }

    return g;
  }

  _createBird() {
    const g = new THREE.Group();
    // Simple V-shape
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x222233, side: THREE.DoubleSide });
    for (let s = -1; s <= 1; s += 2) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.1), wingMat);
      wing.position.x = s * 0.75;
      wing.rotation.z = s * 0.3;
      g.add(wing);
    }
    return g;
  }

  _createRainbow() {
    const g = new THREE.Group();
    const colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff, 0x4400ff, 0x8800ff];
    for (let i = 0; i < colors.length; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(25 + i * 1.5, 0.4, 4, 20, Math.PI),
        new THREE.MeshBasicMaterial({
          color: colors[i], transparent: true, opacity: 0.08,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        })
      );
      arc.rotation.z = Math.PI;
      arc.rotation.y = Math.PI / 4;
      g.add(arc);
    }
    return g;
  }

  update(elapsed) {
    super.update(elapsed);
    // Drift clouds slowly
    for (let i = 0; i < this.clouds.length; i++) {
      this.clouds[i].position.x += Math.sin(elapsed * 0.05 + i * 0.5) * 0.008;
      this.clouds[i].position.y += Math.sin(elapsed * 0.2 + i) * 0.003;
    }

    // Pulse sun rays
    for (let i = 0; i < this.sunRays.length; i++) {
      this.sunRays[i].material.opacity = 0.06 + Math.sin(elapsed * 0.5 + i * 0.8) * 0.03;
    }

    if (this.floatText) this.floatText.position.y = 16 + Math.sin(elapsed * 0.5) * 0.4;
  }
}
