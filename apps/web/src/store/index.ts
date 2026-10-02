import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import auth from './authSlice'
import exams from './examsSlice'
import reference from './referenceSlice'
import toasts from './toastSlice'

export const store = configureStore({
  reducer: { auth, exams, reference, toasts },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
