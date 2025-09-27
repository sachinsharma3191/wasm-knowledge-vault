import { Routes, Route } from 'react-router-dom'
import App from './App'
import PdfViewer from './components/PdfViewer'
import VideoViewer from "./components/VideoViewer.tsx";

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<App />} />
            <Route path="/viewer/:baseId" element={<PdfViewer />} />
            <Route path="/video/:baseId" element={<VideoViewer />} />
        </Routes>
    )
}