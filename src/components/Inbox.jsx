import { Inbox } from '@novu/react';

function Novu() {
  return (
    <Inbox
      applicationIdentifier="mLtXHnJfZNRB"
      subscriberId="69fa4317aca4539eeabcdc44"
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