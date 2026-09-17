import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './state.jsx';
import App from './App.jsx';
import './styles.css';
import './pages.css';

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="fatal">
        <h1>Un problème d’affichage est survenu.</h1>
        <p>Vos données sont conservées sur le serveur.</p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Recharger l’application
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="bottom-right" toastOptions={{ duration: 4500, className: 'sentinel-toast' }} />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
