import { useCanvas } from 'react-iiif-vault';
import invariant from 'tiny-invariant';
import cx from 'classnames';
import {
  getBlockArrowClasses,
  getBlockClasses,
  getBlockImageClasses,
  getBlockTextClasses,
} from '../helpers/behavior-class-names.ts';
import { getValue } from '@iiif/vault-helpers';
import { CanvasPreviewBlock } from './CanvasPreviewBlock.tsx';
import { LazyLoadComponent } from 'react-lazy-load-image-component';

export function CanvasBlock({ index }: { index: number }) {
  const canvas = useCanvas();

  invariant(canvas);

  const canvasViewer = (
    <LazyLoadComponent placeholder={<div className="canvas-preview" />} visibleByDefault={index < 4} threshold={800}>
      <CanvasPreviewBlock />
    </LazyLoadComponent>
  );

  return (
    <div className={cx('block cutcorners image', getBlockClasses(canvas))}>
      {canvas.summary ? (
        <>
          <div className={cx('block cutcorners', getBlockImageClasses(canvas))}>{canvasViewer}</div>
          <div className={cx('block cutcorners info', getBlockTextClasses(canvas))}>
            <div className={cx(getBlockArrowClasses(canvas))}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </div>
            <div className="heading">
              <p>{getValue(canvas.label)}</p>
            </div>
            <div className="text">
              <div>
                {getValue(canvas.summary)
                  .split('\n')
                  .map((paragraph, idx) => (
                    <p key={`about__${idx}`}>{paragraph}</p>
                  ))}
              </div>
              {canvas.requiredStatement && <div className="facts">{getValue(canvas.requiredStatement.value)}</div>}
            </div>
          </div>
        </>
      ) : (
        canvasViewer
      )}
    </div>
  );
}
