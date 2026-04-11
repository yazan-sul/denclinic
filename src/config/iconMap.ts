'use client';

/**
 * Icon mapper utility
 * Maps icon names to icon components - creates them on demand
 */

import React from 'react';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  MessageIcon,
  ReportsIcon,
  SettingsIcon,
  DocumentIcon,
  ProfileIcon,
} from '@/components/Icons';

type IconName = 'home' | 'calendar' | 'users' | 'message' | 'reports' | 'settings' | 'document' | 'profile';

// Map icon names to component constructors
const iconComponents: Record<IconName, React.ComponentType<any>> = {
  home: HomeIcon,
  calendar: CalendarIcon,
  users: UsersIcon,
  message: MessageIcon,
  reports: ReportsIcon,
  settings: SettingsIcon,
  document: DocumentIcon,
  profile: ProfileIcon,
};

/**
 * Get icon component by name
 * @param iconName - The name of the icon
 * @returns React element or null
 */
export const getIcon = (iconName: string): React.ReactNode => {
  const IconComponent = iconComponents[iconName as IconName];
  return IconComponent ? React.createElement(IconComponent) : null;
};
