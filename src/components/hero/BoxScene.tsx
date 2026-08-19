import { useEffect, useRef } from 'react'
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import gsap from 'gsap'
import * as THREE from 'three'

function BoxModel({ onReady, playSpin }: { onReady?: () => void; playSpin: boolean }) {
  const { scene } = useGLTF('/models/box.glb')
  const { camera, size } = useThree()
  const idleTweenRef = useRef<gsap.core.Tween | null>(null)
  const hoveredRef = useRef(false)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const readyFiredRef = useRef(false)
  const readyTimeoutRef = useRef<number | null>(null)
  const spinPlayedRef = useRef(false)

  // Frame the box tightly for this exact camera angle. A bounding-SPHERE
  // fit (the previous approach) has to leave enough room for the box to
  // rotate to any angle without clipping, which wastes a lot of frame —
  // measured fill was only ~60%. Since the camera angle here is fixed
  // (only a few degrees of idle wobble/hover rotation, not a free-spin),
  // projecting the actual AABB corners through this specific view and
  // fitting to THAT is much tighter, with no clipping risk. A lower FOV
  // (was 35) also flattens perspective — the previous close/wide combo
  // was what made the box look "dented" at its near edge.
  useEffect(() => {
    const box3 = new THREE.Box3().setFromObject(scene)
    const center = box3.getCenter(new THREE.Vector3())
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = 22

    const yaw = THREE.MathUtils.degToRad(-24)
    const pitch = THREE.MathUtils.degToRad(14)
    const dir = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    )

    // How far the AABB corners project past the frame edge (in NDC, 1.0
    // = exactly at the edge) at a given camera distance along `dir`.
    const maxNdcAt = (distance: number) => {
      cam.position.copy(center).addScaledVector(dir, distance)
      cam.near = distance / 100
      cam.far = distance * 100
      cam.lookAt(center)
      cam.updateProjectionMatrix()
      cam.updateMatrixWorld()
      const vpMatrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
      let m = 0
      for (let i = 0; i < 8; i++) {
        const corner = new THREE.Vector3(
          i & 1 ? box3.max.x : box3.min.x,
          i & 2 ? box3.max.y : box3.min.y,
          i & 4 ? box3.max.z : box3.min.z,
        ).applyMatrix4(vpMatrix)
        m = Math.max(m, Math.abs(corner.x), Math.abs(corner.y))
      }
      return m
    }

    // NDC doesn't scale linearly with 1/distance (perspective is more
    // non-linear the closer the camera is), so one rescale from a rough
    // guess undershoots. Refining a few times against the ACTUAL NDC at
    // each new distance converges quickly to a true tight fit.
    let distance = box3.getBoundingSphere(new THREE.Sphere()).radius * 3
    for (let i = 0; i < 4; i++) {
      distance *= maxNdcAt(distance)
    }
    // A factor < 1 here moves the camera CLOSER than the exact tight fit
    // (bigger apparent box) — that's what was clipping the bottom edge
    // even at rest, and worse once hover's 1.08x scale bump was added on
    // top. Needs to stay > 1 so there's real headroom for that hover
    // scale plus a small safety margin.
    distance *= 1.22
    cam.position.copy(center).addScaledVector(dir, distance)
    cam.near = Math.max(distance / 100, 0.1)
    cam.far = distance * 100
    cam.lookAt(center)
    cam.updateProjectionMatrix()
    // The model is loaded (useGLTF suspended until now) and the camera
    // is framed for the CURRENT `size` — but R3F reports an initial
    // fallback/default size before its ResizeObserver delivers the real
    // one, so this effect can legitimately re-run a second time shortly
    // after mount with a corrected `size`. Firing the entrance on the
    // very first run locks in that still-wrong framing, and the visible
    // box "jumps" once the accurate framing lands right after — so
    // instead of firing immediately, wait until `size` has stayed the
    // same for a short beat (debounced), and only then treat it as
    // settled and start the entrance from that final framing.
    if (readyTimeoutRef.current !== null) window.clearTimeout(readyTimeoutRef.current)
    readyTimeoutRef.current = window.setTimeout(() => {
      readyTimeoutRef.current = null
      if (readyFiredRef.current) return
      readyFiredRef.current = true
      onReady?.()
    }, 150)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, camera, size])

  // The "spin on the Y axis" part of the entrance — a real rotation of the
  // 3D object, NOT a CSS rotateY on the DOM element wrapping the canvas (a
  // WebGL canvas inside a CSS 3D-transformed element is compositing-
  // fragile across browsers, flattens out instead of reading as a flip).
  // Fires on `playSpin`'s false→true edge specifically, NOT bundled into
  // the ready-detection effect above: `playSpin` only flips once the DOM
  // bounce entrance is ACTUALLY about to play (see HeroDecor's
  // `startBoxEntrance`), which can be well after the model itself
  // finished loading (e.g. deferred behind a loading screen) — spinning
  // any earlier than that meant it played out invisibly while still
  // hidden, so by the time the box was actually revealed the spin had
  // already finished and only the squash/stretch bounce was left to see.
  useEffect(() => {
    if (!playSpin || spinPlayedRef.current) return
    spinPlayedRef.current = true
    scene.rotation.y = 0
    gsap.to(scene.rotation, { y: Math.PI * 2, duration: 0.6, ease: 'power2.out' })
  }, [playSpin, scene])

  useEffect(() => {
    return () => {
      if (readyTimeoutRef.current !== null) window.clearTimeout(readyTimeoutRef.current)
    }
  }, [])

  // Grab the box's material once so hover can brighten it via emissive,
  // without needing extra scene lights just for a highlight state.
  useEffect(() => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.emissive = new THREE.Color(0xffffff)
        obj.material.emissiveIntensity = 0
        materialRef.current = obj.material
      }
    })
  }, [scene])

  const startIdleWobble = () => {
    idleTweenRef.current?.kill()
    idleTweenRef.current = gsap.to(scene.rotation, {
      z: 0.055,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })
  }

  // The jelly-bounce entrance (including the big "flies up from below the
  // viewport" travel) is a DOM transform on BoxScene's container, in
  // HeroDecor — a squash/stretch + translate there reads the same as it
  // would here, without needing camera headroom for the flight. This 3D
  // object just starts its gentle idle wobble once that lands.
  useEffect(() => {
    const t = setTimeout(startIdleWobble, 980)
    return () => {
      clearTimeout(t)
      idleTweenRef.current?.kill()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene])

  // Ambient tilt: the box leans toward the cursor wherever it is on the
  // page — a real 3D rotation of the mesh, not a flat-image CSS skew.
  useEffect(() => {
    const quickRotY = gsap.quickTo(scene.rotation, 'y', { duration: 0.6, ease: 'power3.out' })
    const quickRotX = gsap.quickTo(scene.rotation, 'x', { duration: 0.6, ease: 'power3.out' })

    const handleMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      quickRotY(nx * 0.35)
      quickRotX(-ny * 0.22)
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [scene])

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (hoveredRef.current) return
    hoveredRef.current = true
    idleTweenRef.current?.kill()
    gsap.to(scene.scale, { x: 1.08, y: 1.08, z: 1.08, duration: 0.3, ease: 'power2.out' })
    gsap.to(scene.rotation, { z: THREE.MathUtils.degToRad(6), duration: 0.3, ease: 'power2.out' })
    if (materialRef.current) {
      gsap.to(materialRef.current, { emissiveIntensity: 0.1, duration: 0.3 })
    }
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hoveredRef.current = false
    gsap.to(scene.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'power2.out' })
    gsap.to(scene.rotation, { z: 0, duration: 0.4, ease: 'power2.out', onComplete: startIdleWobble })
    if (materialRef.current) {
      gsap.to(materialRef.current, { emissiveIntensity: 0, duration: 0.4 })
    }
  }

  return <primitive object={scene} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} />
}

interface BoxSceneProps {
  /** Fires once the model has loaded and the camera is framed — the cue
   * for the caller to start the DOM entrance animation, so the box is
   * actually visible for its whole "flies up" travel instead of loading
   * mid-flight and popping in wherever the animation happened to be. */
  onReady?: () => void
  /** False→true edge plays the one-shot Y-axis spin — set this at the
   *  same moment the DOM bounce entrance actually starts (not whenever
   *  the model happens to finish loading), so the two stay in sync. */
  playSpin: boolean
}

export default function BoxScene({ onReady, playSpin }: BoxSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 2, 22], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
      onCreated={({ gl }) => {
        const canvasEl = gl.domElement
        canvasEl.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.warn('[BoxScene] WebGL context lost — waiting for browser to restore it.')
        })
        canvasEl.addEventListener('webglcontextrestored', () => {
          console.warn('[BoxScene] WebGL context restored.')
        })
      }}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[6, 10, 8]} intensity={1.8} />
      <directionalLight position={[-8, 4, -6]} intensity={0.7} />
      <directionalLight position={[0, -6, 10]} intensity={0.5} />
      <BoxModel onReady={onReady} playSpin={playSpin} />
    </Canvas>
  )
}
