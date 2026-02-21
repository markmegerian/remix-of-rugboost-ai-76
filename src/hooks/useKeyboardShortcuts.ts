import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];

function isTypingInInput(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.includes(el.tagName)) return true;
  if (el.getAttribute('contenteditable') === 'true') return true;
  return false;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isTypingInInput()) return;

      const mod = e.metaKey || e.ctrlKey;

      if (e.key === 'n' && mod) {
        e.preventDefault();
        navigate('/jobs/new');
        return;
      }

      if (e.key === 'j' && mod) {
        e.preventDefault();
        navigate('/dashboard');
        return;
      }
    },
    [navigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
