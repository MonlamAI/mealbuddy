import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mealbuddy',
    short_name: 'Mealbuddy',
    description: 'Office cafeteria lunch management, daily meal voting, and billing',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#2E5A88',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    shortcuts: [
      {
        name: "Today's Lunch / Vote",
        short_name: 'Vote',
        description: 'Cast your daily lunch vote before 10 AM',
        url: '/vote',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'My Dashboard',
        short_name: 'Dashboard',
        description: 'View lunch attendance and meal history',
        url: '/user_dashboard',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Lunch Billing',
        short_name: 'Billing',
        description: 'View monthly cafeteria lunch billing',
        url: '/user_dashboard/billing',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Chef Dashboard',
        short_name: 'Chef',
        description: 'Manage menus and headcount',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
