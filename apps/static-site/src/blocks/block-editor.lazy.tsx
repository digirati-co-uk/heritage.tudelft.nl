import dynamic from 'next/dynamic';

export const BlockEditor =
  process.env.NODE_ENV === 'production'
    ? function Empty() {
        return null;
      }
    : dynamic(() => import('./block-editor'));
