import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Hydration-safe browser capability initialization', () => {
  it('defers SpeechRecognition capability detection until after the first render', () => {
    const source = readSource('src/components/KeyboardShortcutManager.tsx');

    assert.match(
      source,
      /const \[isVoiceSupported, setIsVoiceSupported\] = useState<boolean>\(false\)/,
      'SpeechRecognition support must start from the same deterministic value on server and browser'
    );
    assert.match(
      source,
      /useEffect\(\(\) => \{\s*setIsVoiceSupported\(Boolean\(getSpeechRecognitionConstructor\(\)\)\);\s*\}, \[\]\)/,
      'Browser capability detection must run after mount'
    );
  });

  it('defers navigator.onLine reads until after the first render', () => {
    const source = readSource('src/hooks/useOnlineStatus.ts');

    assert.match(
      source,
      /const \[isOnline, setIsOnline\] = useState<boolean>\(true\)/,
      'Connectivity must start from the same deterministic value on server and browser'
    );
    assert.match(
      source,
      /useEffect\(\(\) => \{\s*if \(typeof window === 'undefined'\) return;\s*setIsOnline\(typeof navigator === 'undefined' \? true : navigator\.onLine\);/,
      'Actual browser connectivity must be read after mount'
    );
  });
});
