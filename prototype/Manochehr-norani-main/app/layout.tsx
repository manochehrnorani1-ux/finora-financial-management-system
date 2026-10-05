import type { Metadata } from 'next';
import '@/lib/patchFetch';
import './globals.css';
import { CompanyProvider } from '@/lib/companyContext';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'DAB Forms and Company Management',
  description: 'Centralized company management and DAB form workspace.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined' && window.fetch) {
                    var _currentFetch = window.fetch;
                    var _desc = Object.getOwnPropertyDescriptor(window, 'fetch') || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), 'fetch');
                    if (!_desc || !_desc.set) {
                      Object.defineProperty(window, 'fetch', {
                        get: function() { return _currentFetch; },
                        set: function(v) { _currentFetch = v; },
                        configurable: true,
                        enumerable: true
                      });
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <AuthProvider>
          <CompanyProvider>{children}</CompanyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

