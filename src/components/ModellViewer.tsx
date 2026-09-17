import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

interface Props {
  url: string
}

/** Nur-Ansicht eines GLB/glTF-Modells: drehen, zoomen, verschieben. */
export function ModellViewer({ url }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    setLaedt(true)
    setFehler(null)

    const startW = mount.clientWidth || 720
    const startH = mount.clientHeight || 320

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf1f5f9)

    const camera = new THREE.PerspectiveCamera(45, startW / startH, 0.1, 1000)
    camera.position.set(3, 2.5, 3.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(startW, startH)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 1.2))
    const hell = new THREE.DirectionalLight(0xffffff, 1.7)
    hell.position.set(4, 8, 6)
    scene.add(hell)
    const fuell = new THREE.DirectionalLight(0xffffff, 0.6)
    fuell.position.set(-5, -2, -4)
    scene.add(fuell)

    const grid = new THREE.GridHelper(1, 10, 0xcbd5e1, 0xe2e8f0)
    scene.add(grid)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08

    let frame = 0
    let disposed = false

    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        if (disposed) return
        const model = gltf.scene
        scene.add(model)

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        model.position.sub(center)

        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const dist = maxDim * 1.7
        camera.position.set(dist, dist * 0.7, dist)
        camera.near = maxDim / 100
        camera.far = maxDim * 100
        camera.updateProjectionMatrix()
        controls.target.set(0, 0, 0)
        controls.update()

        grid.scale.setScalar(maxDim * 2)
        grid.position.y = -size.y / 2

        setLaedt(false)
      },
      undefined,
      (err) => {
        if (disposed) return
        setLaedt(false)
        const meldung = err instanceof Error ? err.message : String(err)
        setFehler(`Modell konnte nicht geladen werden. Nur GLB/glTF (unkomprimiert) möglich. ${meldung}`)
      },
    )

    const onResize = () => {
      const w = mount.clientWidth || startW
      const h = mount.clientHeight || startH
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    const animate = () => {
      frame = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement)
    }
  }, [url])

  return (
    <div className="relative h-72 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div ref={mountRef} className="h-full w-full" />
      {laedt && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500">
          Modell lädt…
        </span>
      )}
      {fehler && (
        <span className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-red-600">
          {fehler}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-slate-400">
        ziehen = drehen · Rad = zoomen · rechts ziehen = verschieben
      </span>
    </div>
  )
}
