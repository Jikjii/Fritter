import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type IconProps = { color: ColorValue; size: number; focused: boolean };

function TabIcon({ name, focusedName, color, size, focused }: IconProps & { name: IconName; focusedName: IconName }) {
  return <Ionicons name={focused ? focusedName : name} color={color} size={size} />;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: (p: IconProps) => <TabIcon {...p} name="sparkles-outline" focusedName="sparkles" />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: (p: IconProps) => <TabIcon {...p} name="wallet-outline" focusedName="wallet" />,
        }}
      />
      <Tabs.Screen
        name="forms"
        options={{
          title: 'Forms',
          tabBarIcon: (p: IconProps) => <TabIcon {...p} name="document-text-outline" focusedName="document-text" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: (p: IconProps) => <TabIcon {...p} name="person-circle-outline" focusedName="person-circle" />,
        }}
      />
    </Tabs>
  );
}
