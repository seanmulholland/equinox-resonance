# **Product Requirements Document: Equinox Resonance**

## **1\. Vision & Vibe**

**Equinox Resonance** is a browser-based, interactive audio-visual experience designed to celebrate the spring equinox. It is "hella vibed out," drawing inspiration from classic WinAmp visualizers, sacred geometry, and modern generative art.

The application serves as a digital singing bowl or ambient mirror. It listens to the environment, generates harmonious "sacred tones" (e.g., Solfeggio frequencies like 432Hz or 528Hz), and visualizes the audio data using mesmerizing, fractal-inspired Three.js particle systems. Optionally, it uses the user's webcam to project their face as a 3D constellation of glowing particles, merging their physical presence with the digital harmonic space.

## **2\. Core Features**

### **2.1. The Harmonic Engine (Audio)**

* **Audio Input (Mic):** Captures microphone input to drive the visualizer's turbulence, speed, and scale.  
* **Generative Soundscapes:** Uses the Web Audio API to generate continuous, slowly shifting drone layers and chime-like sine waves (tuned to sacred frequencies).  
* **Reactivity:** The generated tones modulate based on the microphone input volume and frequency data. If the user makes noise, the drone might shift in timbre or swell in volume.

### **2.2. The Vibe Engine (Visuals)**

* **Fractal/Sacred Geometry Base:** A Three.js environment featuring a central focal point (e.g., a slowly rotating particle torus knot, Metatron's cube, or a fractal shader background).  
* **Audio-Reactive:** Particle size, color (shifting through an iridescent or bioluminescent palette), and velocity are directly mapped to the Web Audio AnalyserNode data (FFT).  
* **Post-Processing:** Heavy use of Bloom (UnrealBloomPass) to give everything a soft, glowing, ethereal aesthetic.

### **2.3. The Avatar Mesh (Webcam Integration)**

* **Face Tracking:** Utilizes MediaPipe Face Mesh (via @mediapipe/face\_mesh or TensorFlow.js) to map 468 facial landmarks in real-time.  
* **Particle Constellation:** Replaces the standard Three.js geometry with an InstancedMesh or Points material mapped to the user's facial landmarks.  
* **Interactive Aura:** As the user speaks or the generated tones pulse, the facial particles ripple, expand, and change color, creating a "digital aura."

### **2.4. Graceful Degradation (The "Chill Fallback")**

* **Zero-Friction Entry:** The app must not break if permissions are denied.  
* **Fallback Mode:** If mic/cam access is denied or unavailable, the app automatically relies entirely on its internal Generative Soundscapes to drive the visualization. The central visual focus defaults to a mesmerizing mathematical shape (like a strange attractor or fractal particle cloud) instead of the face mesh.

## **3\. Technical Architecture & Stack**

* **Framework:** Vite \+ React \+ TypeScript.  
* **3D / WebGL:** three, @react-three/fiber, @react-three/drei.  
* **Computer Vision:** @mediapipe/face\_mesh.  
* **Audio:** Native Web Audio API.  
* **Deployment:** Netlify.

## **4\. User Experience (UX) Flow**

1. **Landing:** A symmetrical sunset over the Pacific from the Bay Area—deep blue in the lower half, transitioning to orange, pink, azul, and hazy blue above. The "Enter the Equinox" button sits on the horizon like a setting sun with a deep golden glow.  
2. **Permission Request:** Clicking the button triggers a custom glassmorphic modal: "To merge with the resonance, we request access to your camera and microphone."  
3. **The Drop:** *Granted* triggers the face-mesh constellation; *Denied* triggers a fallback sacred geometry visualization.  
4. **Interaction:** OrbitControls for the camera; mouse-driven parallax; auto-hiding glassmorphic UI.

## **5\. Agent Instructions: The Equinox Alchemist**

You are a **Creative Technologist and Digital Alchemist**. Your mission is to assist in the manifestation of "Equinox Resonance". You prioritize fluid motion, sacred geometry, and high-fidelity "vibes" over clinical code.

### **A. The Aesthetic North Star**

* **Symmetry & Balance:** Emulate the Bay Area sunset. Deep Pacific blues (![][image1]) meeting hazy azul (![][image2]), fading into soft pinks and golden oranges.  
* **The Glow:** Use heavy Bloom effects. If it doesn't feel like it's emitting light, it's not finished.  
* **Sacred Math:** Favor Golden Ratios (![][image3]), Fibonacci sequences, and Solfeggio frequencies (432Hz, 528Hz) in your logic.

### **B. Technical Directives for the AI**

* **Harmonic Audio:** Create a Web Audio API class with multiple oscillators detuned by 2-5 cents. Map a slow LFO (0.1Hz) to a BiquadFilterNode at 432Hz.  
* **Ethereal Shaders:** Write a custom ShaderMaterial for a Three.js Points mesh. The vertex shader should use 3D Simplex noise for "wind-like" displacement.  
* **The Avatar Constellation:** Map the 468 landmarks to a BufferGeometry constellation. If camera is off, transition smoothly into a rotating Metatron’s Cube or Fermat’s Spiral.

### **C. Interaction Philosophy**

* **Fluidity:** All state transitions must be handled with CSS transitions or TWEEN.js / GSAP. No abrupt jumps.  
* **Non-Intrusive UI:** The UI is a ghost. It only appears when the user's mouse moves, utilizing glassmorphism (blur: 10px, opacity: 0.1).

*Code with intention. Let the resonance guide the syntax.*

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAXCAYAAABaiVzAAAADbElEQVR4Xu1WXYhNURS+YwZJ8cTg3nvOvXMnckkyz8oLL949GCl58CD5mTyIB0OkSJ7Gk+Sv1PgpbwzhaZKSpJB48FcyFEkyw/i+c9Y+d511zj1zy50xyVe7s9a3vrX2Ovvsc87O5f4YLZYYP0zEVBMxh8XfmHOcMNluZbL10xAymvZ9/zjGqOd5r2zMAbGN0IxgfKPexh0Qe8xaGLfhttk4USqVVolmBHWrNk5AMw/xB9TBfmTjDohfklofMLptPIKI3nAlurq6ptKvVCpFraHvgW9vb58pOc8xjmoNFxLcMBrfJppu1oppQv6W5mX+Qa0R/ivmnSv2IHXlctl3cT43cO8x1tLHYmyhBtedThMB5A4Ef2oO/iHdSKFQmFGnYTZ4UPm/rA43vdpy4k+pMS2Oi+CHO4dctA9lvkiH3o8It1lpPpHDgiwLGUkniYQbTkh0dHQs1AVh99tGhI9N7Pse/e/2DTG1tvpe3Vrrlf+CO6harU4zmig3fJU8vm7bleat6BY7zgVIxreg8CiwTmnqNadvgv59rVF8n7LHrGUh7ys1521MQzTDMZKrxQCK7K+x4fOQhL3KDprQT8s2xycA/46SBBDdgLITNyS7IcE7SN5ry2vwg5Vao1gsVhiAYI+NCX/N2WkFanxtcbALrhuZ031RdkatONDDCfADjPGVsnECsWMYp2T+ezbOG10gE+yzMeEvKzvRhOXFv6k1iv+o7DFrWaheG9m6QzHS/Uqwar2xQC56OiedndaEbNVR/WHzPe9uXBXlP1F2tAuMJjGHRoOaA9Sg94s2wORzmsMWmS38CqVJTGB58RPvkfC7xH6ZUeuz8p/y15SiGeXvjj7ip3UO0dnZOd3pNO+SHwaOLDK2yUotxBM/k0jM1b1Rq2sVrpUOam1K0bjc3aLhvz1Ry3LWJ/D/XJTGRyuQi/+YEz9++iiyxnLIn6X84INgNO8wrhiOW+uw8ntMXrA47lTkYG9A6sSOrOCekcfDWqp5F+Qp5IfYZQqxPfJaw0ml8BK4bX543g22owa4IYwLYvfpxpTmrPDB4tLG6NeaUnic4zl4A+zlfniO5cLOcRr48yW3J5/PF3C9yu8Gc3StGmrfBXuoiSEz2CxkTZIVm2hMpl7+459Es7dYs+s1A4311JhqHFHvC5ndWFr0NzVqa8P2Vh7kAAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAYCAYAAACmwZ5SAAADvElEQVR4Xt1XXYhNURS+dzRv8ldXdO89+/5RfqLmJoV4kJp3hEQpmhcZPPktzTB58EDJb3mQF6N4GIRHJV5MRkJJCQ80hYcxYZjxrX3WvrPOOvvOTDfGXF+t7l7f+s5ea+29z54zicSfQFIT443hAuKlxJkKRghNICRtnbbW+ih4/DEh1yVeVJypDWIe35RBEOwqFAtzNS8BzZp8Pr9S8xKZTCady+VaisViVsckoNlgjFmr+ZEA/RDsGP1KvtJP0mp+wh6RJpvNLpE6q0DgBgVRwCbYVTT1VoksONktxDtojN/pWgOuFbH3sHbYF10YIZ1OZ/j5c/htC8LcG7VOA9rPXIM1HXcwgRkqFApTWXc9EsQuzNQPU8OaIx9FTfNwOefjubtwzwsJoQG6fknAH5Q+c1UbcOAGLiLPAthqHaddRvwVGfl0gpTECnphz+URp8lkAXTUfQVxAW+kjyT7hKTCK79P+sw9xE+D5iVoHtSyQvPyBeWaDolgFCw4o+hJXPxSoanWcIV3fqlUSjkO4ymY557zha5Xc9LXQHzZaJoE163JCDh5exV+pxjHJtI8GtvtOOzEHVDJMB69Ip0G9oX9T7DHERED/F6hD+dWtYBr0hoyXFgLpc7ephw8EAkkKkVdFuNRG2bQO2t5ujzw26biFuBfOB0W6qmOa7DuvuYloPngqWcY2IUCJz2oY8zfFuPYRD4e/glYF+yHi+uVRt75HHviNHoeDYqj4W2alxjLPPbMG88uMH9ajGMTVXg+sezfdHGcoDlOQzcrceWmcqNRtzT8ftKgoU7JO4Cf5cuvQUd9VB0nOuXjUeR6N/ZNpHmfhsC6Lh53yx13bzf4d9WeR337q8UkOM81zUdAIv0O0ZeUauSSLyEniDTs+4IzJqAcR8KxGSqXy41KYoHYd80RwA/68muQRv6F8AK7uEVPRqukOL5toyAOjeyRPo5xSWoEP4PHV5DzrNaAW45L7rDmCfS8zO9bVGzSIl+NXpjw23OAxjhuRU4wW2po5YiniWmHMP6GIlulBtw8fvYovXewFvJTqdRkiovjaxvAXIv5/fwK+yimioD13ZqXQPwB7Jd1fCuigeJ3mLDxZzrmwKvYY8Jv5c067hCEH+4DsAv0TavjBORbZ8Jv7ddoepWOy5qpYWiaBRUDa45rvm6A4k9iUTrcPwEy5hYD8a20STTWmroDNQDro13D73bHU7P61cjl8s3/Q8MvuaEeycujjsXoZE3ku/zfYCwXR434i1PXA4bbr20hanuqLvAb4+5m6F3cY/UAAAAASUVORK5CYII=>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAXCAYAAAA/ZK6/AAABCElEQVR4XrVSOw7CMAxtAYk7IMVO1LIgZjgAN2BiZkTiBgzciAUGTsDOCRhh5TNCsdsmTUI/MPCktI7fs/1qNQhqEVrPD1Sk/wMz7Jephf2OS3hIdXljRNzYXCOoIPFzdWhTwYMDHlj7NQg4J/GNzimKIuHzBkqpEdugs83t8JQnIF48aZj6JeKqM3S/W/FBSbnW9wAAJlxgvIapaKV5ihdgL4DFUqqZvlODgSEJUspjsbGsm7M+dD3zdyRCiJ5ZFSfiuN/lmHN2A0Q4+w0ZYd5lyHYo3tHG6IUvOlNfbKPFIkBYOv9IHZxtWCgt5SRZ2pezGmZ0pqIVjot8GSqJErjabysbda7gDbggNDxZEhiYAAAAAElFTkSuQmCC>