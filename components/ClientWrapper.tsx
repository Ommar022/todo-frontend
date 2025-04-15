'use client';

import React from 'react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../theme';

const queryClient = new QueryClient();

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={{ }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MantineProvider>
  );
}