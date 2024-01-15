import { CanvasPanel } from 'react-iiif-vault';
import { useRef } from 'react';
import { Preset } from '@atlas-viewer/atlas';
import { createPortal } from 'react-dom';
import '../styles/modal.scss';

export function CanvasModal({ onClose }: { onClose: () => void }) {
  const atlas = useRef<Preset | null>(null);
  return createPortal(
    <div className="canvas-modal">
      <div className="canvas-modal__content">
        <div className="canvas-modal__inner-frame">
          <div className="canvas-modal__content-slide">
            <div className="canvas-modal__top-part" style={{ position: 'relative', display: 'flex' }}>
              <div className="viewer-container">
                <CanvasPanel.Viewer
                  onCreated={(ctx) => void (atlas.current = ctx)}
                  containerStyle={{ height: '100%', flex: 1 }}
                >
                  <CanvasPanel.RenderCanvas strategies={['empty', 'images', 'media', 'textual-content']} />
                </CanvasPanel.Viewer>
              </div>
            </div>
            <div className="canvas-modal__info-and-nav">
              <div className="canvas-modal__info">
                <div className="canvas-modal__info-title">Female voices in speech recognition technology</div>
                <div>
                  <p>Credit: Odette Scharenborg</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button className="canvas-modal__close" type="button" style={{ zIndex: 20 }} onClick={() => onClose()}>
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            viewBox="0 0 16.5 16.5"
            xmlSpace="preserve"
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          >
            <polygon
              points="14.8,0 8.2,6.6 1.7,0 0,1.7 6.6,8.2 0,14.8 1.7,16.5 8.2,9.9 14.8,16.5 16.5,14.8 9.9,8.2 16.5,1.7 "
              style={{ fill: '#fff' }}
            ></polygon>
          </svg>
        </button>
      </div>
    </div>,
    document.getElementById('modal-portal') as HTMLElement
  );
}
