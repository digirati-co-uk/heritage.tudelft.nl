import { CanvasPanel, useCanvas } from 'react-iiif-vault';
import { useMemo, useRef, useState } from 'react';
import { DefaultPresetOptions, Preset } from '@atlas-viewer/atlas';
import invariant from 'tiny-invariant';
import cx from 'classnames';
import { CanvasModal } from './CanvasModal.tsx';

export function CanvasPreviewBlock() {
  const [isOpen, setIsOpen] = useState(false);
  const canvas = useCanvas();
  const atlas = useRef<Preset | null>(null);
  const config = useMemo(
    () =>
      [
        'default-preset',
        { runtimeOptions: { visibilityRatio: 1.2 }, interactive: false } as DefaultPresetOptions,
      ] as any,
    []
  );

  invariant(canvas);

  return (
    <div className={cx('canvas-preview')}>
      <div className="viewer-container" onClick={() => setIsOpen(true)}>
        <CanvasPanel.Viewer
          onCreated={(ctx) => void (atlas.current = ctx)}
          containerStyle={{ height: '100%', pointerEvents: 'none' }}
          renderPreset={config}
        >
          <CanvasPanel.RenderCanvas strategies={['images']} />
        </CanvasPanel.Viewer>
      </div>
      {canvas.summary ? null : <div className="caption">Photos of post-war commemorations</div>}
      {isOpen ? (
        <CanvasModal
          onClose={() => {
            setIsOpen(false);
            console.log('is open', isOpen);
          }}
        />
      ) : null}
    </div>
  );
}
