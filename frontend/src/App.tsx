import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './state/useStore'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import CoursePlayer from './pages/CoursePlayer'
import AssessmentView from './pages/AssessmentView'
import Settings from './pages/Settings'

// The tank game pulls in Three.js, so it is lazily loaded — learners who never
// open it never pay for that bundle, keeping the core app lightweight.
const TankGame = lazy(() => import('./tank/TankGame'))

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

  // The tank game is self-contained and playable without the course onboarding.
  const onboardingExempt = location.pathname === '/onboarding' || location.pathname === '/tank'
  const needsOnboarding = !profile?.onboardingComplete
  if (needsOnboarding && !onboardingExempt) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/" element={<Home />} />
      <Route path="/course/:courseId" element={<CoursePlayer />} />
      <Route path="/course/:courseId/assessment/:assessmentId" element={<AssessmentView />} />
      <Route path="/course/:courseId/:moduleId/:lessonId" element={<CoursePlayer />} />
      <Route
        path="/tank"
        element={
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center bg-slate-950" role="status" aria-label="Loading game">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500" />
              </div>
            }
          >
            <TankGame />
          </Suspense>
        }
      />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
