import { defineConfig, minimalPreset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimalPreset,
    // Apple touch icon (used on iOS home screen)
    apple: {
      sizes: [180],
      padding: 0.1,
      resizeOptions: { background: '#217A51' },
    },
    // Standard maskable icon for Android adaptive icons
    maskable: {
      sizes: [512],
      padding: 0.1,
      resizeOptions: { background: '#217A51' },
    },
    // Transparent icons for general use
    transparent: {
      sizes: [64, 192, 512],
      padding: 0.05,
      resizeOptions: { background: 'transparent' },
    },
  },
  images: ['public/icon.svg'],
});
