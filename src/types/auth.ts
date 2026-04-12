export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  profile: {
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
}
