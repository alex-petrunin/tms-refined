import React, {type FC, type PropsWithChildren, useContext} from 'react';
import {HostAPI} from "../../../../@types/globals";

const HostContext = React.createContext<HostAPI>(null as unknown as HostAPI);

const host = (await YTApp.register()) as HostAPI;

export const HostProvider: FC<PropsWithChildren> = ({children}) => {
  return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
};

export const useHost = () => {
  return useContext(HostContext);
};
