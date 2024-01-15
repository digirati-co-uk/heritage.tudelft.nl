import { CanvasNormalized } from '@iiif/presentation-3-normalized';

const EXHIBITION_BEHAVIOURS = ['column', 'block', 'cutcorners', 'caption-left', 'left', 'bottom', 'row', 'column'];

export function getBlockClasses(canvas: CanvasNormalized) {
  const image = canvas.summary ? '' : 'image';

  const baseClasses = [image];

  if (canvas.behavior.length) {
    baseClasses.push(...(canvas.behavior as string[]));
  } else {
    baseClasses.push('w-8', 'h-8', 'image');
  }

  return baseClasses;
}

export function getBlockArrowClasses(canvas: CanvasNormalized) {
  const blockClasses = getBlockClasses(canvas);
  if (blockClasses.includes('bottom') || blockClasses.includes('column')) {
    return ['arrow', 'up'];
  }
  if (blockClasses.includes('caption-left') || blockClasses.includes('left')) {
    return ['arrow', 'right'];
  }
  return ['arrow', 'left'];
}
export function getBlockTextClasses(canvas: CanvasNormalized) {
  const blockClasses = getBlockClasses(canvas);
  return blockClasses.reduce((textClasses, cls) => {
    if (EXHIBITION_BEHAVIOURS.indexOf(cls) === -1) {
      let newCls = cls;
      if ((blockClasses.indexOf('bottom') !== -1 || blockClasses.indexOf('column') !== -1) && cls.indexOf('h-') === 0) {
        newCls = `h-${Math.ceil(parseInt(cls.substr(2), 10) / 4)}`;
      }
      if (
        (blockClasses.indexOf('left') !== -1 ||
          blockClasses.indexOf('row') !== -1 ||
          blockClasses.indexOf('right') !== -1) &&
        cls.indexOf('w-') === 0
      ) {
        newCls = `w-${Math.ceil(parseInt(cls.slice(2), 10) / 3)}`;
      }
      textClasses.push(newCls);
    }
    return textClasses;
  }, [] as string[]);
}

export function getBlockImageClasses(canvas: CanvasNormalized) {
  const blockClasses = getBlockClasses(canvas);
  return blockClasses.reduce((textClasses, cls) => {
    if (EXHIBITION_BEHAVIOURS.indexOf(cls) === -1) {
      let newCls = cls;
      if (blockClasses.indexOf('column') !== -1 && cls.indexOf('h-') === 0) {
        newCls = `h-${parseInt(cls.slice(2), 10) - Math.ceil(parseInt(cls.slice(2), 10) / 4)}`;
      }
      if (blockClasses.indexOf('row') !== -1 && cls.indexOf('w-') === 0) {
        newCls = `w-${parseInt(cls.slice(2), 10) - Math.ceil(parseInt(cls.slice(2), 10) / 3)}`;
      }
      if (blockClasses.indexOf('left') !== -1 && cls.indexOf('w-') === 0) {
        newCls = `w-${parseInt(cls.slice(2), 10) - Math.ceil(parseInt(cls.slice(2), 10) / 3)}`;
      }
      if (blockClasses.indexOf('right') !== -1 && cls.indexOf('w-') === 0) {
        newCls = `w-${parseInt(cls.slice(2), 10) - Math.ceil(parseInt(cls.slice(2), 10) / 3)}`;
      }
      if (blockClasses.indexOf('bottom') !== -1 && cls.indexOf('h-') === 0) {
        newCls = `h-${parseInt(cls.slice(2), 10) - Math.ceil(parseInt(cls.slice(2), 10) / 4)}`;
      }
      textClasses.push(newCls);
    }
    return textClasses;
  }, [] as string[]);
}
