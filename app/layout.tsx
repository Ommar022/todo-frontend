import '@mantine/core/styles.css';
import React from 'react';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import ClientWrapper from '@/components/ClientWrapper';
import Cookies from 'js-cookie';
import NotificationModal from './Todo/NotificationModal';

export const metadata = {
  title: 'Todo List',
  description: 'I am using Mantine with Next.js!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <link rel="shortcut icon" href="/todo.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}