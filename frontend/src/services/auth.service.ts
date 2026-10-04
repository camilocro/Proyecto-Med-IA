import apiClient from '@/lib/apiClient'
import { AuthResponse, LoginInput, RegisterInput } from '@/types'

export const authService = {
  async login(credentials: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/login', credentials)
    return data.data
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<{ data: AuthResponse }>('/auth/register', input)
    return data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },
}
