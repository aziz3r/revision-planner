import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { request } from '../api/client'
import { EXAM_QUERY, type ExamDto, type ExamKind, type StrapiList, type StrapiSingle } from '../api/types'

export interface ExamInput {
  name: string
  date: string
  weight: number
  kind: ExamKind
  notes?: string
  subject?: string | null
}

interface ExamsState {
  items: ExamDto[]
  loading: boolean
  error: string | null
}

const initialState: ExamsState = { items: [], loading: false, error: null }

export const fetchExams = createAsyncThunk<ExamDto[]>('exams/fetch', async () => {
  const response = await request<StrapiList<ExamDto>>('/api/exams', { query: EXAM_QUERY })
  return response.data
})

export const createExam = createAsyncThunk<ExamDto, ExamInput>('exams/create', async (input) => {
  const response = await request<StrapiSingle<ExamDto>>('/api/exams', {
    method: 'POST',
    body: { data: input },
  })
  return response.data
})

export const updateExam = createAsyncThunk<
  ExamDto,
  { documentId: string; changes: Partial<ExamInput> }
>('exams/update', async ({ documentId, changes }) => {
  const response = await request<StrapiSingle<ExamDto>>(`/api/exams/${documentId}`, {
    method: 'PUT',
    body: { data: changes },
  })
  return response.data
})

export const deleteExam = createAsyncThunk<string, string>('exams/delete', async (documentId) => {
  await request<void>(`/api/exams/${documentId}`, { method: 'DELETE' })
  return documentId
})

const slice = createSlice({
  name: 'exams',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchExams.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchExams.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
      })
      .addCase(fetchExams.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Chargement impossible'
      })
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.items = state.items.filter((exam) => exam.documentId !== action.payload)
      })
  },
})

export default slice.reducer
