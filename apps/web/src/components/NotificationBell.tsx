import {
  NotificationBell,
  PopoverNotificationCenter,
} from "@novu/notification-center";
import { useTheme } from "next-themes";

export const NotificationBellComponent = () => {
  const { resolvedTheme } = useTheme();

  return (
    <PopoverNotificationCenter
      colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
      showUserPreferences={false}
    >
      {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
    </PopoverNotificationCenter>
  );
};
