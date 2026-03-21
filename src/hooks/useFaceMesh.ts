/**
 * useFaceMesh — MediaPipe Face Mesh integration.
 * Models served locally from /public/mediapipe/ to avoid CDN flakiness.
 * Async inference loop — one send at a time, no queuing.
 */

import { useEffect, useRef, useState } from 'react'

export interface FaceMeshHook {
  landmarks: number[][] | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
}

export function useFaceMesh(enabled: boolean): FaceMeshHook {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [landmarks, setLandmarks] = useState<number[][] | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled) return

    let active = true
    let streamRef: MediaStream | null = null

    async function setup() {
      // Dynamic import to avoid SSR / initial bundle bloat
      const { FaceMesh } = await import('@mediapipe/face_mesh')

      if (!active) return

      const faceMesh = new FaceMesh({
        // Serve from local public dir — avoids CDN CORS issues
        locateFile: (file: string) => `/mediapipe/${file}`,
      })

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: false,   // faster without iris refinement
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

      // Get webcam stream
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        })
      } catch (err) {
        console.warn('useFaceMesh: camera access failed', err)
        return
      }

      if (!active) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef = stream

      const video = videoRef.current
      if (!video) return

      video.srcObject = stream
      video.onloadedmetadata = async () => {
        await video.play()
        setReady(true)

        // Inference loop — await each send to avoid queuing
        const loop = async () => {
          while (active) {
            if (video.readyState >= 2 && !video.paused) {
              try {
                await faceMesh.send({ image: video })
              } catch (e) {
                // Suppress per-frame errors (tab hidden, etc.)
              }
            }
            // ~30fps — enough for face tracking, not taxing
            await new Promise(r => setTimeout(r, 33))
          }
        }
        loop()
      }
    }

    setup().catch(console.error)

    return () => {
      active = false
      streamRef?.getTracks().forEach(t => t.stop())
      setLandmarks(null)
      setReady(false)
    }
  }, [enabled])

  return { landmarks, videoRef, ready }
}
