import { useState } from 'react';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import ScannerPage from './features/scanner/pages/ScannerPage';
import EditorPage from './features/editor/pages/EditorPage';

type Screen = 'dashboard' | 'scanner' | 'editor';

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  if (screen === 'scanner') {
    return (
      <ScannerPage
        onBack={() => setScreen('dashboard')}
        onCapture={(dataUrl) => {
          setCapturedImage(dataUrl);
          setScreen('editor');
        }}
      />
    );
  }

  if (screen === 'editor' && capturedImage) {
    return (
      <EditorPage
        capturedImage={capturedImage}
        onBack={() => setScreen('scanner')}
        onSave={() => setScreen('dashboard')}
      />
    );
  }

  return <DashboardPage onNewScan={() => setScreen('scanner')} />;
}

export default App;