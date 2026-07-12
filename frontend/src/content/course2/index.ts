import type { Course } from '../types'
import { c2module01 } from './module01'
import { c2module02 } from './module02'
import { c2module03 } from './module03'
import { c2module04 } from './module04'
import { c2module05 } from './module05'
import { c2module06 } from './module06'

export const course2: Course = {
  id: 'course2',
  title: 'AI-Power Usage',
  tagline: 'Become fluent at using AI: prompting, tools, and workflows.',
  description:
    'Prompt engineering, context engineering, agentic workflow design, and tool literacy, not coding. Every checkpoint is a hands-on exercise graded by your own connected AI against a rubric — no multiple choice anywhere in this course.',
  accent: '#0891b2',
  modules: [c2module01, c2module02, c2module03, c2module04, c2module06, c2module05],
}
