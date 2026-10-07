import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

/** Notifications (toasts), au style du site : fond brun nuit, liseré rouge. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast !rounded-full !font-sans group-[.toaster]:shadow-2xl',
          description: 'group-[.toast]:text-dust-300',
        },
      }}
      {...props}
    />
  );
}
