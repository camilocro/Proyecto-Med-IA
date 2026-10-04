import { Request } from 'express'

export interface AuthenticatedRequest extends Request {
  usuario: {
    id_usuario: number
    correo:     string
    rol:        string
  }
}

export interface ApiSuccessResponse<T> {
  success: true
  data:    T
}

export interface ApiErrorResponse {
  success: false
  message: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export const ok = <T>(data: T): ApiSuccessResponse<T> => ({ success: true, data })
