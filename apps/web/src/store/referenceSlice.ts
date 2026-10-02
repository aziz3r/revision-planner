import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { request } from '../api/client'
import type { StrapiList, StrapiSingle, StudentDto, SubjectDto } from '../api/types'
import type { AvailabilitySlot } from '@revision-planner/core'

interface ReferenceState {
  subjects: SubjectDto[]
  student: StudentDto | null
  loading: boolean
  error: string | null
}

const initialState: ReferenceState = {
  subjects: [],
  student: null,
  loading: false,
  error: null,
}

export const fetchSubjects = createAsyncThunk<SubjectDto[]>('reference/subjects', async () => {
  const response = await request<StrapiList<SubjectDto>>('/api/subjects', {
    query: { fields: ['name', 'difficulty', 'color'], sort: ['name:asc'] },
  })
  return response.data
})

export const fetchStudent = createAsyncThunk<StudentDto | null>('reference/student', async () => {
  const response = await request<StrapiList<StudentDto>>('/api/students', {
    query: { fields: ['displayName', 'availability', 'sessionMinutes', 'maxMinutesPerDay'] },
  })
  return response.data[0] ?? null
})

export const saveAvailability = createAsyncThunk<
  StudentDto,
  { documentId: string; availability: AvailabilitySlot[]; sessionMinutes: number; maxMinutesPerDay: number }
>('reference/saveAvailability', async ({ documentId, ...changes }) => {
  const response = await request<StrapiSingle<StudentDto>>(`/api/students/${documentId}`, {
    method: 'PUT',
    body: { data: changes },
  })
  return response.data
})

const slice = createSlice({
  name: 'reference',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(fetchSubjects.fulfilled, (state, action) => {
        state.subjects = action.payload
      })
      .addCase(fetchStudent.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchStudent.fulfilled, (state, action) => {
        state.loading = false
        state.student = action.payload
      })
      .addCase(fetchStudent.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Profil indisponible'
      })
      .addCase(saveAvailability.fulfilled, (state, action) => {
        state.student = action.payload
      })
  },
})

export default slice.reducer
