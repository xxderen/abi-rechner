import { useMemo } from 'react'
import { AdmissionTab } from './components/admission/AdmissionTab'
import { CoursesTab } from './components/courses/CoursesTab'
import { ExamsTab } from './components/exams/ExamsTab'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { ResultTab } from './components/result/ResultTab'
import { TopBar } from './components/TopBar'
import { computeAll } from './logic/compute'
import { useAppState } from './state/useAppState'
import { useHashTab } from './state/useHashTab'

export default function App() {
  const { state, dispatch, storageOk } = useAppState()
  const [tab, navigate] = useHashTab()
  const computed = useMemo(() => computeAll(state), [state])

  return (
    <div className="app">
      <Header />
      <TopBar tab={tab} onNavigate={navigate} computed={computed} />
      <main className="main">
        {tab === 'kurse' && <CoursesTab state={state} dispatch={dispatch} computed={computed} storageOk={storageOk} />}
        {tab === 'zulassung' && <AdmissionTab state={state} dispatch={dispatch} computed={computed} onNavigate={navigate} />}
        {tab === 'abitur' && <ExamsTab state={state} dispatch={dispatch} computed={computed} />}
        {tab === 'ergebnis' && <ResultTab state={state} dispatch={dispatch} computed={computed} />}
      </main>
      <Footer />
    </div>
  )
}
