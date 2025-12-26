import React, { type FC, type PropsWithChildren } from "react";
import { WithQueryClient } from "./hooks/use-query-client.tsx";
import { HostProvider } from "./hooks/use-host.tsx";

export const WidgetRootComponent: FC<PropsWithChildren> = ({ children }) => {
  return (
    <React.StrictMode>
      <WithQueryClient>
          <HostProvider>{children}</HostProvider>
      </WithQueryClient>
    </React.StrictMode>
  );
};
