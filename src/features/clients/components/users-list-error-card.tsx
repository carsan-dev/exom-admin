import { ErrorState } from '@/components/page'

interface UsersListErrorCardProps {
  title: string
  message: string
  onRetry: () => void
}

export function UsersListErrorCard({ title, message, onRetry }: UsersListErrorCardProps) {
  return <ErrorState className="border-y border-border" title={title} description={message} onRetry={onRetry} />
}
