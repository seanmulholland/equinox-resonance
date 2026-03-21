/**
 * useFaceMesh — MediaPipe Face Mesh integration.
 *
 * @mediapipe/face_mesh is a Closure-compiled IIFE that registers to `this`.
 * Vite's ESM interop can't extract the constructor from it.
 * We load face_mesh.js as a script tag so it attaches FaceMesh to `window`.
 */

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { FaceMesh: any }
}

export interface FaceMeshHook {
  landmarks: number[][] | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export function useFaceMesh(camStream: MediaStream | null): FaceMeshHook {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [landmarks, setLandmarks] = useState<number[][] | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!camStream) return

    let active = true

    async function setup() {
      // Load face_mesh.js as a script — it attaches FaceMesh to window
      await loadScript('/mediapipe/face_mesh.js')

      if (!active) return
      if (!window.FaceMesh) {
        console.error('useFaceMesh: window.FaceMesh not found after script load')
        return
      }

      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `/mediapipe/${file}`,
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      faceMesh.onResults((results: any) => {
        if (!active) return
        const faces = results.multiFaceLandmarks
        if (faces && faces.length > 0) {
          setLandmarks(faces[0].map((p: any) => [p.x, p.y, p.z ?? 0]))
        } else {
          setLandmarks(null)
        }
      })

      const video = videoRef.current
      if (!video) {
        console.warn('useFaceMesh: no video element')
        return
      }

      video.srcObject = camStream
      try {
        await video.play()
      } catch (e) {
        console.warn('useFaceMesh: video.play() failed', e)
        return
      }
      if (!active) return
      setReady(true)

      // Async inference loop — one send at a time, ~30fps
      while (active) {
        if (video.readyState >= 2 && !video.paused) {
          try {
            await faceMesh.send({ image: video })
          } catch {
            // suppress per-frame errors (tab hidden, etc.)
          }
        }
        await new Promise(r => setTimeout(r, 33))
      }
    }

    setup().catch(console.error)

    return () => {
      active = false
      setLandmarks(null)
      setReady(false)
    }
  }, [camStream])

  return { landmarks, videoRef, ready }
}
