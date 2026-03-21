import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// No StrictMode — avoids double-mounting AudioContext and WebGL context
createRoot(document.getElementById('root')!).render(<App />)
