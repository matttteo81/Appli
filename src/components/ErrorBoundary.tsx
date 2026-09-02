import React from 'react';

/**
 * Barrière anti-plantage : si un enfant lève une erreur au rendu, on affiche un
 * repli au lieu de faire tomber toute l'application.
 *
 * IMPORTANT (Nouvelle Architecture RN) : une erreur de rendu NON rattrapée par
 * une barrière est traitée comme FATALE et ferme l'app. Beaucoup de crashs « à
 * la connexion » viennent d'un écran rendu avec des données pas encore
 * complètement chargées (transition de navigation). D'où l'option `autoRetry` :
 * après une erreur, on retente le rendu peu après (les données sont alors
 * prêtes), jusqu'à quelques essais, puis on garde le repli si ça persiste.
 */
export class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode; autoRetry?: boolean },
  { hasError: boolean; tries: number }
> {
  state = { hasError: false, tries: 0 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn('[Fil] ErrorBoundary a intercepté une erreur :', error);
    if (this.props.autoRetry && this.state.tries < 8) {
      this.timer = setTimeout(() => {
        this.setState((s) => ({ hasError: false, tries: s.tries + 1 }));
      }, 250);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
