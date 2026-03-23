import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MICRO-BANANA | AI Image Studio',
  description:
    'Generate stunning AI images from text or transform existing images. Powered by Stable Diffusion XL and free AI providers.',
  keywords: ['AI', 'image generation', 'text to image', 'image to image', 'stable diffusion'],
  authors: [{ name: 'NADIR INFOGRAPH' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
