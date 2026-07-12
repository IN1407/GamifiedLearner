import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson } from '../content/types'
import type { MathLevel } from '../lib/db'
import { lessonContextText } from '../lib/lessonContext'
import Markdown from './Markdown'
import QuizBlock from './QuizBlock'
import ExerciseBlock from './ExerciseBlock'
import PromptExerciseBlock from './PromptExerciseBlock'
import VizBlock from './VizBlock'

/**
 * Renders one lesson's blocks and tracks interactive completion. The parent
 * gets (earnedXp, allInteractiveDone) so it can enable "Complete lesson".
 */
export default function LessonView({
  lesson,
  mathLevel,
  alreadyCompleted,
  onProgress,
}: {
  lesson: Lesson
  mathLevel: MathLevel
  alreadyCompleted: boolean
  onProgress: (earnedXp: number, complete: boolean) => void
}) {
  const interactiveIds = useMemo(() => {
    const ids: string[] = []
    lesson.blocks.forEach((b, i) => {
      if (b.type === 'quiz' || b.type === 'exercise' || b.type === 'promptExercise') ids.push(`b${i}`)
    })
    return ids
  }, [lesson])

  const [xpByBlock, setXpByBlock] = useState<Record<string, number>>({})
  const [doneByBlock, setDoneByBlock] = useState<Record<string, boolean>>({})
  // Reset per-lesson state when navigating between lessons.
  const lessonRef = useRef(lesson.id)
  if (lessonRef.current !== lesson.id) {
    lessonRef.current = lesson.id
    setXpByBlock({})
    setDoneByBlock({})
  }

  useEffect(() => {
    const xp = Object.values(xpByBlock).reduce((a, b) => a + b, 0)
    const complete = interactiveIds.every((id) => doneByBlock[id])
    onProgress(xp, complete)
  }, [xpByBlock, doneByBlock, interactiveIds, onProgress])

  const context = useMemo(() => lessonContextText(lesson, mathLevel), [lesson, mathLevel])

  return (
    <article>
      {lesson.blocks.map((block, i) => {
        const key = `b${i}`
        switch (block.type) {
          case 'md':
            return <Markdown key={key} md={block.levelVariants?.[mathLevel] ?? block.md} />
          case 'viz':
            return <VizBlock key={key} viz={block.viz} caption={block.caption} />
          case 'quiz':
            return (
              <QuizBlock
                key={`${lesson.id}-${key}`}
                quiz={block.quiz}
                lessonContext={context}
                lessonId={lesson.id}
                onXpChange={(xp) => setXpByBlock((s) => ({ ...s, [key]: xp }))}
                onCompleteChange={(c) => setDoneByBlock((s) => ({ ...s, [key]: c }))}
              />
            )
          case 'exercise':
            return (
              <ExerciseBlock
                key={`${lesson.id}-${key}`}
                exercise={block.exercise}
                onXpChange={(xp) => setXpByBlock((s) => ({ ...s, [key]: xp }))}
                onCompleteChange={(c) => setDoneByBlock((s) => ({ ...s, [key]: c }))}
              />
            )
          case 'promptExercise':
            return (
              <PromptExerciseBlock
                key={`${lesson.id}-${key}`}
                exercise={block.exercise}
                onXpChange={(xp) => setXpByBlock((s) => ({ ...s, [key]: xp }))}
                onCompleteChange={(c) => setDoneByBlock((s) => ({ ...s, [key]: c }))}
              />
            )
        }
      })}
      {alreadyCompleted && (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          You already completed this lesson — feel free to review, but XP was awarded once.
        </p>
      )}
    </article>
  )
}
