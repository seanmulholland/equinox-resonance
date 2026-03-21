/**
 * useFaceMesh — MediaPipe Face Mesh integration.
 *
 * Accepts the SAME camera MediaStream that was granted in the PermissionModal
 * so we don't create a competing second stream (which can silently fail).
 * Models served locally from /public/mediapipe/.
 */

import { useEffect, useRef, useState } from 'react'

export interface FaceMeshHook {
  landmarks: number[][] | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
}

export function useFaceMesh(camStream: MediaStream | null): FaceMeshHook {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [landmarks, setLandmarks] = useState<number[][] | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!camStream) return

    let active = true

    async function setup() {
      // CJS module — dynamic import puts exports on .default in Vite
      const mod = await import('@mediapipe/face_mesh')
      const FaceMesh = (mod as any).FaceMesh ?? (mod as any).default?.FaceMesh
      if (!FaceMesh) {
        console.error('useFaceMesh: FaceMesh constructor not found in module', Object.keys(mod))
        return
      }
      if (!active) return

      const faceMesh = new FaceMesh({
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
        console.warn('useFaceMesh: no video element ref')
        return
      }

      video.srcObject = camStream
      video.onloadedmetadata = async () => {
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
              // suppress per-frame errors (e.g. tab hidden)
            }
          }
          await new Promise(r => setTimeout(r, 33))
        }
      }
    }

    setup().catch(console.error)

    return () => {
      active = false
      setLandmarks(null)
      setReady(false)
      // Don't stop the stream here — App owns its lifecycle
    }
  }, [camStream])

  return { landmarks, videoRef, ready }
}
