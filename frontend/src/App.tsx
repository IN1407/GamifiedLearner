import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './state/useStore'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import CoursePlayer from './pages/CoursePlayer'
import Settings from './pages/Settings'

export default function App() {
  const hydrated = useStore((s) => s.hydrated)
  const profile = useStore((s) => s.profile)
  const hydrate = useStore((s) => s.hydrate)
  const location = useLocation()

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500/30 border-t-indigo-600" />
      </div>
    )
  }

  const needsOnboarding = !profile?.onboardingComplete
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Home />} />
      <Route path="/course/:courseId" element={<CoursePlayer />} />
      <Route path="/course/:courseId/:moduleId/:lessonId" element={<CoursePlayer />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
