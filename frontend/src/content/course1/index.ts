import type { Course } from '../types'
import { module01 } from './module01'
import { module02 } from './module02'
import { module03 } from './module03'
import { module04 } from './module04'
import { module05 } from './module05'
import { module06 } from './module06'
import { module07 } from './module07'
import { module08 } from './module08'
import { module09 } from './module09'
import { module10 } from './module10'
import { module11 } from './module11'
import { module12 } from './module12'
import { module13 } from './module13'
import { module14 } from './module14'

export const course1: Course = {
  id: 'course1',
  title: 'Python for AI & Backend',
  tagline: 'Zero to fluent: Python, FastAPI, and how transformers actually work.',
  description:
    'A sequential path from your first variable to reading modern attention papers: Python, data structures, backend APIs with FastAPI, the math behind ML, neural network internals, transformers, efficient attention, and running/fine-tuning real models.',
  accent: '#4f46e5',
  modules: [
    module01,
    module02,
    module03,
    module04,
    module05,
    module06,
    module07,
    module08,
    module09,
    module10,
    module11,
    module12,
    module14,
    module13,
  ],
}
