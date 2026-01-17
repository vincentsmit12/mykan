'use client';

import { Inbox } from '@novu/nextjs';
import { useTheme } from 'next-themes';
import { env } from "next-runtime-env";

export default function NotificationInbox({ subscriberId }: { subscriberId: string }) {
  const { resolvedTheme } = useTheme();
  const applicationIdentifier = env("NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER");

  if (!applicationIdentifier) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Inbox
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      appearance={{
        variables: {
          colorBackground: isDark ? '#161616' : 'hsl(0deg 0% 98.8%)',
          colorForeground: isDark ? '#ededed' : 'hsl(0deg 0% 9%)',
          colorPrimary: isDark ? '#ededed' : 'hsl(0deg 0% 9%)',
          colorPrimaryForeground: isDark ? '#161616' : 'hsl(0deg 0% 98.8%)',
          colorSecondary: isDark ? '#232323' : 'hsl(0deg 0% 95.3%)',
          colorSecondaryForeground: isDark ? '#bbb' : 'hsl(0deg 0% 43.5%)',
          colorNeutral: isDark ? '#282828' : 'hsl(0deg 0% 92.9%)',
        },
        elements: {
            bellIcon: {
                color: isDark ? '#ededed' : 'hsl(0deg 0% 9%)',
            }
        }
      }}
    />
  );
}
