import { useManifest } from 'react-iiif-vault';
import { getValue } from '@iiif/vault-helpers';
import invariant from 'tiny-invariant';

export function TitlePanel() {
  const manifest = useManifest();

  invariant(manifest, 'Manifest not found');

  return (
    <div className="block title cutcorners w-4 h-4">
      <div className="boxtitle">Exhibition</div>
      <div className="maintitle">
        {getValue(manifest.label)}
        <div className="github-link-wrapper">{/* There is no GitHub Link in the viewer mode. */}</div>
        <div className="iiif-link-wrapper">
          <a href={`${manifest.id}?manifest=${manifest.id}`} target="_blank" title="Drag and Drop IIIF Resource"></a>
        </div>
      </div>
      {/* This strange div is a spacer.. */}
      <div />
    </div>
  );
}
