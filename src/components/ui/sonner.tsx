import type { ComponentProps } from 'react'
import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/hooks/use-theme'

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = useTheme((state) => state.theme)

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheck aria-hidden="true" className="h-4 w-4" />,
        info: <Info aria-hidden="true" className="h-4 w-4" />,
        warning: <TriangleAlert aria-hidden="true" className="h-4 w-4" />,
        error: <OctagonX aria-hidden="true" className="h-4 w-4" />,
        loading: <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast font-sans group-[.toaster]:!rounded-none group-[.toaster]:!border group-[.toaster]:!border-border-strong group-[.toaster]:!bg-background-surface group-[.toaster]:!text-foreground group-[.toaster]:shadow-overlay',
          title: 'group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:text-foreground',
          description: 'group-[.toast]:text-[13px] group-[.toast]:text-foreground-secondary',
          success: '[&_[data-icon]]:text-status-success',
          error: '[&_[data-icon]]:text-status-error',
          warning: '[&_[data-icon]]:text-status-warning',
          info: '[&_[data-icon]]:text-status-info',
          actionButton:
            'group-[.toast]:!rounded-none group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          cancelButton:
            'group-[.toast]:!rounded-none group-[.toast]:!border group-[.toast]:!border-border-strong group-[.toast]:!bg-transparent group-[.toast]:!text-foreground-secondary',
          closeButton:
            'group-[.toast]:!rounded-none group-[.toast]:!border-border-strong group-[.toast]:!bg-background-surface group-[.toast]:!text-foreground-secondary',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
