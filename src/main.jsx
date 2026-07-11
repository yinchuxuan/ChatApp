import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/renderer.css';
import './components/iconFallback.js';

const container = document.getElementById('root');
createRoot(container).render(<App />);
