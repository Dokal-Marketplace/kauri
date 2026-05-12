import { Inbox } from '@novu/react';
import { useCurrentUser } from '../hooks/useCurrentUser';

function Novu() {
  const { isLoaded, isSignedIn, clerkUser } = useCurrentUser()

  if (!isLoaded || !isSignedIn || !clerkUser) return null

  return (
    <Inbox
      applicationIdentifier="mLtXHnJfZNRB"
      subscriberId={clerkUser.id}
      socketUrl="wss://socket.novu.co"
      appearance={{
        variables: {
          colorPrimary: "#DD2450",
          colorForeground: "#0E121B"
        }
      }}
    />
  );
}

export default Novu
