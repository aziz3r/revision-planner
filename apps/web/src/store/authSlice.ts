import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { request } from '../api/client'
import type { AuthResponse } from '../api/types'
import { clearSession, readSession, saveSession, type Session } from '../auth/session'

interface AuthState {
  session: Session | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  session: readSession(),
  loading: false,
  error: null,
}

export const login = createAsyncThunk<Session, { identifier: string; password: string }>(
  'auth/login',
  async (credentials) => {
    const response = await request<AuthResponse>('/api/auth/local', {
      method: 'POST',
      body: credentials,
      anonymous: true,
    })
    const session: Session = { jwt: response.jwt, user: response.user }
    saveSession(session)
    return session
  },
)

export const register = createAsyncThunk<
  Session,
  { username: string; email: string; password: string }
>('auth/register', async (payload) => {
  const response = await request<AuthResponse>('/api/auth/local/register', {
    method: 'POST',
    body: payload,
    anonymous: true,
  })
  const session: Session = { jwt: response.jwt, user: response.user }
  saveSession(session)
  return session
})

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      clearSession()
      state.session = null
      state.error = null
    },
  },
  extraReducers(builder) {
    for (const thunk of [login, register]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true
          state.error = null
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false
          state.session = action.payload
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false
          state.error = action.error.message ?? 'Authentification impossible'
        })
    }
  },
})

export const { logout } = slice.actions
export default slice.reducer
