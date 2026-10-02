import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

/**
 * Notifications de l'interface.
 *
 * Remplace les `alert()` de la version precedente : ceux-ci bloquaient le fil
 * d'execution du navigateur, n'etaient pas stylables et rendaient toute
 * verification automatisee impossible.
 */
const slice = createSlice({
  name: 'toasts',
  initialState: [] as Toast[],
  reducers: {
    notify: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload)
      },
      prepare(message: string, kind: ToastKind = 'info') {
        return { payload: { id: nanoid(), message, kind } }
      },
    },
    dismiss(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload)
    },
  },
})

export const { notify, dismiss } = slice.actions
export default slice.reducer
