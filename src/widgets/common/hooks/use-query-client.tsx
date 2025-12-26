import type { FC, PropsWithChildren } from "react";
import {  QueryClient, QueryClientProvider } from '@tanstack/react-query';


export const queryClient = new QueryClient();

export const WithQueryClient: FC<PropsWithChildren> = ({ children }) => {
    return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};
