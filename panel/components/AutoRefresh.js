'use client';
// Vuelve a cargar los datos de la página cada cierto tiempo (sin recargar toda la página).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoRefresh({ seconds = 30 }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [router, seconds]);
  return null;
}
