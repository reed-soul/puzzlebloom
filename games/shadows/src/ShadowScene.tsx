import { type Heights, heightAt, MAX_HEIGHT, SIZE } from '@puzzlebloom/shadows-engine';
import type { ThemeColors } from '@puzzlebloom/theme-core';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * The plot, in three dimensions.
 *
 * This is the only file in the monorepo that imports three.js, and it is
 * deliberately the least clever file in the game: it is handed a plot and it
 * draws a plot. All the rules — what a stone casts, whether the shadows agree,
 * what to say about it — live in `@puzzlebloom/shadows-engine`, which has no
 * renderer in it and is tested without a DOM.
 *
 * Two consequences of that split are visible here:
 *
 *   - Nothing in this file is the source of truth. If WebGL is missing, the
 *     `failed` branch draws a sentence and the game is still completely
 *     playable on the DOM plot below — the picture is a view, not the game.
 *   - The canvas is `aria-hidden`. Everything it shows is reachable another
 *     way, so announcing it would only read the same figure out twice; the
 *     control surface, the three plans and the status line are all real
 *     elements the whole time.
 */

interface Props {
  heights: Heights;
  colors: ThemeColors;
  /** The column a tap landed on, as `rank * SIZE + file`. */
  onTap: (cell: number) => void;
}

interface SceneHandle {
  setHeights: (heights: Heights) => void;
  setColors: (colors: ThemeColors) => void;
  dispose: () => void;
}

const TAU = Math.PI * 2;

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

function createScene(host: HTMLElement, onTap: (cell: number) => void): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  // The whole figure is available as text and as buttons elsewhere in the
  // page; a second reading of it here would be noise for a screen reader.
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.cursor = 'grab';
  // Vertical drags are camera moves, not page scrolls.
  canvas.style.touchAction = 'none';
  host.append(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  /**
   * A fixed distance with a rotating camera: the plot is small, and a camera
   * that also dollies would let a child lose the figure behind the wall of its
   * own stones. `focus` only decides which way the camera faces — where the
   * figure lands in the frame is worked out from the figure itself, below.
   */
  const focus = new THREE.Vector3(0, 0.5, 0);
  const distance = 20;
  let yaw = Math.PI / 4;
  let pitch = 0.62;

  const placeCamera = (): void => {
    camera.position.set(
      focus.x + distance * Math.cos(pitch) * Math.sin(yaw),
      focus.y + distance * Math.sin(pitch),
      focus.z + distance * Math.cos(pitch) * Math.cos(yaw),
    );
    camera.lookAt(focus);
  };

  /**
   * The frame, measured rather than guessed.
   *
   * A diamond seen from a corner is not the same shape as the square it came
   * from, and it changes as the camera orbits, so any hand-chosen frustum is
   * either loose at one angle or cropping at another. Instead: take the box the
   * stones could currently fill, project its eight corners onto the camera's
   * own axes, and size the frustum to what came out. Correct at every yaw, and
   * it stays correct if `SIZE` or the stack limit ever changes.
   *
   * `ceiling` is the height that box reserves, and it is deliberately just
   * above the tallest column rather than the stack limit: reserving four levels
   * for an empty plot would shrink it to a corner of the panel, while resizing
   * to every single stone would make the camera twitch on each tap.
   */
  let ceiling = 1.4;
  const EDGE = SIZE / 2 + 0.4;
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const corner = new THREE.Vector3();

  const fit = (): void => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;

    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);

    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    let left = Number.POSITIVE_INFINITY;
    let most = Number.NEGATIVE_INFINITY;
    for (const x of [-EDGE, EDGE]) {
      for (const y of [-0.45, ceiling]) {
        for (const z of [-EDGE, EDGE]) {
          offset.copy(corner.set(x, y, z)).sub(camera.position);
          const across = offset.dot(right);
          const along = offset.dot(up);
          low = Math.min(low, along);
          high = Math.max(high, along);
          left = Math.min(left, across);
          most = Math.max(most, across);
        }
      }
    }

    const aspect = width / height;
    const margin = 0.3;
    let halfWidth = (most - left) / 2 + margin;
    let halfHeight = (high - low) / 2 + margin;
    if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect;
    else halfHeight = halfWidth / aspect;

    const centreX = (most + left) / 2;
    const centreY = (high + low) / 2;
    camera.left = centreX - halfWidth;
    camera.right = centreX + halfWidth;
    camera.top = centreY + halfHeight;
    camera.bottom = centreY - halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    request();
  };

  /* ---------------------------------------------------------------- lights */

  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.15);
  scene.add(hemi);

  const lamp = new THREE.DirectionalLight(0xffffff, 2.6);
  lamp.position.set(6, 13, 7);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  lamp.shadow.bias = -0.0007;
  lamp.shadow.camera.left = -7;
  lamp.shadow.camera.right = 7;
  lamp.shadow.camera.top = 7;
  lamp.shadow.camera.bottom = -7;
  lamp.shadow.camera.near = 1;
  lamp.shadow.camera.far = 40;
  scene.add(lamp);

  /* ----------------------------------------------------------- the plate */

  const plateGeometry = new THREE.BoxGeometry(SIZE + 0.7, 0.4, SIZE + 0.7);
  const plateMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0 });
  const plate = new THREE.Mesh(plateGeometry, plateMaterial);
  plate.position.y = -0.2; // top face exactly at y = 0, where the stones start
  plate.receiveShadow = true;
  scene.add(plate);

  const half = SIZE / 2;
  const linePoints: number[] = [];
  for (let step = 0; step <= SIZE; step += 1) {
    const at = -half + step;
    linePoints.push(at, 0, -half, at, 0, half);
    linePoints.push(-half, 0, at, half, 0, at);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
  const gridMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.3 });
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.position.y = 0.004; // just clear of the plate, so the lines do not flicker
  scene.add(grid);

  /* ---------------------------------------------------------- the stones */

  const stoneGeometry = new THREE.BoxGeometry(0.94, 1, 0.94);
  const stoneMaterial = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.03 });
  const stones = new THREE.Group();
  scene.add(stones);

  /** Stones per column, in stacking order, so a lift removes the top one. */
  const columns = new Map<number, THREE.Mesh[]>();

  const stoneAt = (cell: number, level: number): THREE.Mesh => {
    const mesh = new THREE.Mesh(stoneGeometry, stoneMaterial);
    const file = cell % SIZE;
    const rank = Math.floor(cell / SIZE);
    mesh.position.x = file - half + 0.5;
    mesh.position.z = rank - half + 0.5;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.level = level;
    // A stone grows out of the one beneath it rather than falling through the
    // stack: the growth is the placement, so there is no moment where the
    // figure is wrong.
    mesh.scale.y = 0.08;
    mesh.position.y = level + mesh.scale.y / 2;
    stones.add(mesh);
    return mesh;
  };

  /* ------------------------------------------------------------- render */

  let queued = 0;
  const request = (): void => {
    if (!queued) queued = requestAnimationFrame(step);
  };

  const step = (): void => {
    queued = 0;
    let settling = false;
    for (const mesh of stones.children) {
      if (mesh.scale.y >= 0.999) continue;
      mesh.scale.y += (1 - mesh.scale.y) * 0.32;
      if (1 - mesh.scale.y < 0.004) mesh.scale.y = 1;
      mesh.position.y = (mesh.userData.level as number) + mesh.scale.y / 2;
      settling = true;
    }
    renderer.render(scene, camera);
    if (settling) request();
  };

  /* -------------------------------------------------------------- input */

  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  const ndc = new THREE.Vector2();

  let pointer: number | null = null;
  let travelled = 0;
  let lastX = 0;
  let lastY = 0;

  const pick = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // A mathematical plane rather than the plate mesh: the ray then reaches the
    // ground through a stack of stones instead of stopping on its front face,
    // which is what makes a tap on top of a tower land on the tower's column.
    if (!raycaster.ray.intersectPlane(ground, hit)) return;
    if (Math.abs(hit.x) > half || Math.abs(hit.z) > half) return;
    const file = clamp(Math.round(hit.x + half - 0.5), 0, SIZE - 1);
    const rank = clamp(Math.round(hit.z + half - 0.5), 0, SIZE - 1);
    onTap(rank * SIZE + file);
  };

  const onDown = (event: PointerEvent): void => {
    pointer = event.pointerId;
    travelled = 0;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = 'grabbing';
  };

  const onMove = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    travelled += Math.abs(dx) + Math.abs(dy);
    yaw = (yaw - dx * 0.0075) % TAU;
    pitch = clamp(pitch + dy * 0.006, 0.2, 1.25);
    placeCamera();
    // The frame is measured against the camera's own axes, so turning the
    // camera means measuring again.
    fit();
  };

  const onUp = (event: PointerEvent): void => {
    if (pointer !== event.pointerId) return;
    pointer = null;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
    // A drag that turned the plot is not a tap on it. Eight pixels is roughly
    // the width of a fingertip's wobble.
    if (travelled < 8) pick(event);
  };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  const observer = new ResizeObserver(() => fit());

  placeCamera();
  observer.observe(host);
  fit();

  return {
    setHeights(next: Heights): void {
      for (let cell = 0; cell < SIZE * SIZE; cell += 1) {
        const wanted = heightAt(next, Math.floor(cell / SIZE), cell % SIZE);
        const column = columns.get(cell) ?? [];
        while (column.length > wanted) {
          const mesh = column.pop();
          if (mesh) stones.remove(mesh);
        }
        while (column.length < wanted) {
          column.push(stoneAt(cell, column.length));
        }
        columns.set(cell, column);
      }
      let tallest = 0;
      for (const height of next) tallest = Math.max(tallest, height);
      const nextCeiling = clamp(tallest + 0.9, 1.4, MAX_HEIGHT);
      if (nextCeiling !== ceiling) {
        ceiling = nextCeiling;
        fit();
      }
      request();
    },

    setColors(colors: ThemeColors): void {
      stoneMaterial.color.set(colors.brand);
      plateMaterial.color.set(colors.surface);
      gridMaterial.color.set(colors.ink);
      hemi.color.set(colors.surface);
      hemi.groundColor.set(colors.ink);
      request();
    },

    dispose(): void {
      observer.disconnect();
      if (queued) cancelAnimationFrame(queued);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      for (const mesh of stones.children) stones.remove(mesh);
      columns.clear();
      stoneGeometry.dispose();
      stoneMaterial.dispose();
      plateGeometry.dispose();
      plateMaterial.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

export function ShadowScene({ heights, colors, onTap }: Props) {
  const host = useRef<HTMLDivElement | null>(null);
  const handle = useRef<SceneHandle | null>(null);
  const [failed, setFailed] = useState(false);

  // The tap callback changes on every render of the parent; the scene must not
  // be rebuilt to hear it, so it reads through a ref instead.
  const listener = useRef(onTap);
  useEffect(() => {
    listener.current = onTap;
  }, [onTap]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let scene: SceneHandle;
    try {
      scene = createScene(element, (cell) => listener.current(cell));
    } catch {
      // No WebGL, or no GPU, or a driver that lied about it. This is a view
      // failing, not a game failing: say so plainly and let the DOM carry on.
      setFailed(true);
      return;
    }
    handle.current = scene;
    return () => {
      handle.current = null;
      scene.dispose();
    };
  }, []);

  // Declared after the setup effect so that on the first mount the scene
  // exists before it is asked to draw anything.
  useEffect(() => {
    handle.current?.setHeights(heights);
  }, [heights]);

  useEffect(() => {
    handle.current?.setColors(colors);
  }, [colors]);

  return (
    <div className="pb-shd__view" ref={host}>
      {failed ? (
        <p className="pb-shd__view-note">
          This browser cannot draw the stones in three dimensions. The plot below works the same way.
        </p>
      ) : null}
    </div>
  );
}
