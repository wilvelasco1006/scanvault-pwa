import { useState } from 'react';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ScannerPage from './features/scanner/pages/ScannerPage';
import EditorPage from './features/editor/pages/EditorPage';
import type { DocumentType } from './types/scan';

type Screen = 'dashboard' | 'scanner' | 'editor';

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('document');

  if (screen === 'scanner') {
    return (
      <ScannerPage
        onBack={() => setScreen('dashboard')}
        onCapture={(dataUrl, capturedType) => {
          setCapturedImage(dataUrl);
          setDocumentType(capturedType);
          setScreen('editor');
        }}
      />
    );
  }

  if (screen === 'editor' && capturedImage) {
    return (
      <EditorPage
        capturedImage={capturedImage}
        documentType={documentType}
        onBack={() => setScreen('scanner')}
        onSaved={() => setScreen('dashboard')}
      />
    );
  }

  return <DashboardPage onNewScan={() => setScreen('scanner')} />;
}

export default App;