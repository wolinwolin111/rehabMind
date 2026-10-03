import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme.css';
import './styles.css';
import './motion.css';
import './expandable.css';
import './muscle-explorer.css';
import './postop.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
