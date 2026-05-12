import { Inbox } from '@novu/react';

function Novu(tenantId) {
  return (
    <Inbox
    applicationIdentifier={import.meta.env.VITE_NOVU_APP_ID}
    subscriberId={tenantId}
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