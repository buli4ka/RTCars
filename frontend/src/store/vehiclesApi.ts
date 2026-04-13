import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface VehicleListParams {
  page?: number
  limit?: number
  make?: string
  model?: string
  yearMin?: number
  yearMax?: number
  sourceId?: number
  damageMain?: string
  fuelType?: string
  transmission?: string
  search?: string
}

export interface Vehicle {
  id: number
  sourceId: number
  externalId: string
  vin?: string
  year?: number
  make?: string
  model?: string
  trim?: string
  bodyStyle?: string
  color?: string
  fuelType?: string
  transmission?: string
  driveType?: string
  engineSize?: string
  odometer?: number
  damageMain?: string
  damageSec?: string
  keysPresent?: boolean
  runAndDrive?: boolean
  location?: string
  auctionDate?: string
  currentBid?: string
  buyNowPrice?: string
  imageUrls: string[]
  lotNumber?: string
  auctionUrl?: string
}

export interface VehicleListResponse {
  data: Vehicle[]
  total: number
  page: number
  limit: number
}

export interface BidHistoryEntry {
  id: number
  bid: string
  recordedAt: string
}

export const vehiclesApi = createApi({
  reducerPath: 'vehiclesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getVehicles: builder.query<VehicleListResponse, VehicleListParams>({
      query: (params) => ({ url: '/vehicles', params }),
    }),
    getVehicle: builder.query<Vehicle, number>({
      query: (id) => `/vehicles/${id}`,
    }),
    getVehicleBidHistory: builder.query<BidHistoryEntry[], number>({
      query: (id) => `/vehicles/${id}/bid-history`,
    }),
  }),
})

export const {
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useGetVehicleBidHistoryQuery,
} = vehiclesApi
