import React from 'react';

/**
 * Barrière anti-plantage : si un enfant lève une erreur au rendu
 * (par ex. un module natif absent ou incompatible), on affiche un
 * repli au lieu de faire tomber toute l'application.
 */
export class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[Wingo] ErrorBoundary a intercepté une erreur :', error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
