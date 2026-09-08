import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import React from 'react'

export interface MyRouterContext {
  auth: {
    session: any
    user: any
    isLoading: boolean
    signOut: () => Promise<void>
  }
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <Outlet />
  )
}
