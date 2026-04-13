import { configureStore } from '@reduxjs/toolkit'
import { vehiclesApi } from './vehiclesApi'
import { authApi } from './authApi'

export const store = configureStore({
  reducer: {
    [vehiclesApi.reducerPath]: vehiclesApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(vehiclesApi.middleware, authApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
