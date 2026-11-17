import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((value) => value[0])
    .join('')
    .toUpperCase()
}

interface NotificationRecipientCellProps {
  name: string
  email: string
  avatarUrl?: string | null
}

export function NotificationRecipientCell({ name, email, avatarUrl }: NotificationRecipientCellProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 flex-none border border-border">
        <AvatarImage src={avatarUrl ?? undefined} alt={name} />
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{name}</p>
        <p className="truncate text-sm text-foreground-secondary">{email}</p>
      </div>
    </div>
  )
}
