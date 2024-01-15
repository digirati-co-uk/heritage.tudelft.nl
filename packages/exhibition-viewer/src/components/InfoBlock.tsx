import { useCanvas, useRenderingStrategy } from 'react-iiif-vault';
import { getValue } from '@iiif/vault-helpers';
import invariant from 'tiny-invariant';
import cx from 'classnames';

export function InfoBlock() {
  const canvas = useCanvas();
  const [strategy] = useRenderingStrategy({ strategies: ['textual-content'] });

  invariant(canvas);
  invariant(strategy.type === 'textual-content');

  return (
    <div className={cx('block cutcorners info', canvas.behavior)}>
      <div className="text">
        {strategy.items.map((item, idx) => (
          <div key={idx} className="text" dangerouslySetInnerHTML={{ __html: getValue(item.text) }} />
        ))}
        <p>
          <button className="readmore">Read more</button>
        </p>
      </div>
    </div>
  );
}
