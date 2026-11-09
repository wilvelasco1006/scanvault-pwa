import { useCallback, useState } from 'react';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ScannerPage from './features/scanner/pages/ScannerPage';
import EditorPage from './features/editor/pages/EditorPage';
import SessionPage from './features/session/pages/SessionPage';
import {
  createPage,
  movePage,
  removePage,
} from './features/session/lib/pageOps';
import type { DocumentType, PageEditState, ScanPage } from './types/scan';

type Screen = 'dashboard' | 'scanner' | 'session' | 'editor';

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  /** Arranca una sesión de escaneo vacía: cada escaneo es un documento nuevo. */
  const startSession = useCallback(() => {
    setPages([]);
    setEditingPageId(null);
    setScreen('scanner');
  }, []);

  const handleCapture = useCallback(
    (dataUrl: string, documentType: DocumentType) => {
      setPages((current) => [...current, createPage(dataUrl, documentType)]);
    },
    [],
  );

  /** "Listo" en la cámara → revisar las páginas capturadas. */
  const handleDoneScanning = useCallback(() => {
    setScreen('session');
  }, []);

  /** Salir de la cámara sin perder lo ya escaneado. */
  const handleExitScanner = useCallback(() => {
    setScreen(pages.length > 0 ? 'session' : 'dashboard');
  }, [pages.length]);

  const handleEditPage = useCallback((id: string) => {
    setEditingPageId(id);
    setScreen('editor');
  }, []);

  const handleCommitPage = useCallback(
    (renderedDataUrl: string, state: PageEditState) => {
      setPages((current) =>
        current.map((page) =>
          page.id === editingPageId
            ? { ...page, ...state, renderedDataUrl }
            : page,
        ),
      );
      setEditingPageId(null);
      setScreen('session');
    },
    [editingPageId],
  );

  const handleRemovePage = useCallback((id: string) => {
    setPages((current) => removePage(current, id));
  }, []);

  const handleMovePage = useCallback(
    (id: string, direction: 'up' | 'down') => {
      setPages((current) => movePage(current, id, direction));
    },
    [],
  );

  /** Documento guardado en IndexedDB: se cierra la sesión. */
  const handleSaved = useCallback(() => {
    setPages([]);
    setEditingPageId(null);
    setScreen('dashboard');
  }, []);

  const editingPage =
    pages.find((page) => page.id === editingPageId) ?? null;

  if (screen === 'scanner') {
    return (
      <ScannerPage
        pageCount={pages.length}
        onBack={handleExitScanner}
        onCapture={handleCapture}
        onDone={handleDoneScanning}
      />
    );
  }

  if (screen === 'session') {
    return (
      <SessionPage
        pages={pages}
        onAddPage={() => setScreen('scanner')}
        onEditPage={handleEditPage}
        onRemovePage={handleRemovePage}
        onMovePage={handleMovePage}
        onBack={() => setScreen('dashboard')}
        onSaved={handleSaved}
      />
    );
  }

  if (screen === 'editor' && editingPage) {
    return (
      <EditorPage
        key={editingPage.id}
        sourceDataUrl={editingPage.sourceDataUrl}
        initial={{
          rotation: editingPage.rotation,
          filter: editingPage.filter,
          corners: editingPage.corners,
          perspectiveApplied: editingPage.perspectiveApplied,
        }}
        onBack={() => {
          setEditingPageId(null);
          setScreen('session');
        }}
        onCommit={handleCommitPage}
      />
    );
  }

  return <DashboardPage onNewScan={startSession} />;
}

export default App;
