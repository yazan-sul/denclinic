'use client';

import { createContext, useContext } from 'react';

export type LayoutRole = 'DOCTOR' | 'STAFF' | null;

export const ActiveRoleContext = createContext<LayoutRole>(null);

export function useActiveRole(): LayoutRole {
  return useContext(ActiveRoleContext);
}