import { Asset, AssetResponse } from './NASA.types.ts';
import { NASA } from './NASA.ts';
import { IIIFBuilder } from '@iiif/builder';

export async function assetToManifest(
  nasaId: string,
  asset: AssetResponse,
  api: NASA,
  // @ts-ignore
  builder: IIIFBuilder,
  baseUrl: string
) {
  const metadataLink = asset.collection.items.find((i: any) => i.href.endsWith('metadata.json'));
  const thumbnailLink = asset.collection.items.find((i: any) => i.href.endsWith('~thumb.jpg'));
  const originalLink = asset.collection.items.find((i: any) => i.href.indexOf('~orig.') !== -1);

  if (!metadataLink || !originalLink) {
    return null;
  }

  const metadata = await api.link<Asset>(
    (asset as any).collection.items.find((i: any) => i.href.endsWith('metadata.json')).href
  );

  // Things we want.
  const title = metadata['AVAIL:Title'] || metadata['XMP:Title'] || metadata['IPTC:ObjectName'];
  const description =
    metadata['EXIF:ImageDescription'] ||
    metadata['AVAIL:Description'] ||
    metadata['XMP:Description'] ||
    metadata['IPTC:Caption-Abstract'];
  // Metadata keys.
  const location = metadata['AVAIL:Location'] || metadata['XMP:Location'];
  const subjectTree = metadata['XMP:HierarchicalSubject'];
  const copyright = metadata['XMP:Rights'] || metadata['EXIF:Copyright'];
  const credit = metadata['IPTC:Credit'] || metadata['XMP:Credit'];
  const lensMode = metadata['EXIF:LensModel'];
  const subjects = metadata['AVAIL:Keywords'] || metadata['IPTC:Keywords'] || metadata['XMP:Subject'];
  const dateCreated = metadata['IPTC:DateCreated'] || metadata['XMP:DateCreated'] || metadata['AVAIL:DateCreated'];

  const width = metadata['File:ImageWidth'] || metadata['EXIF:ImageWidth'] || metadata['EXIF:ExifImageWidth'] || 1024;
  const height =
    metadata['File:ImageHeight'] || metadata['EXIF:ImageHeight'] || metadata['EXIF:ExifImageHeight'] || 1024;

  const created = dateCreated ? new Date(dateCreated) : null;

  const manifestId = `${baseUrl}/${nasaId}.json`;
  const builtManifest = builder.createManifest(manifestId, (manifest: any) => {
    manifest.addLabel(title || `Image ${nasaId}`, 'en');
    if (description) {
      manifest.addSummary(description, 'en');
    }

    description && manifest.addMetadata({ en: ['Summary'] }, { en: [description] });
    location && manifest.addMetadata({ en: ['Location'] }, { en: [location] });
    subjectTree && manifest.addMetadata({ en: ['Subject tree'] }, { en: [subjectTree] });
    subjects && manifest.addMetadata({ en: ['Subjects'] }, { en: subjects });
    credit && manifest.addMetadata({ en: ['Image credit'] }, { en: credit.split('/') });
    created &&
      !Number.isNaN(created.getFullYear()) &&
      manifest.addMetadata({ en: ['Year'] }, { en: [`${created.getFullYear()}`] });
    dateCreated && manifest.addMetadata({ en: ['Date'] }, { en: [dateCreated] });
    lensMode && manifest.addMetadata({ en: ['Lens'] }, { en: [lensMode] });

    if (copyright) {
      manifest.setRequiredStatement({
        label: { en: ['Copyright'] },
        value: { en: [copyright] },
      });
    } else if (credit) {
      manifest.setRequiredStatement({
        label: { en: ['Credit'] },
        value: { en: [credit] },
      });
    }

    manifest.createCanvas(`${manifestId}/c0`, (canvas: any) => {
      canvas.addLabel(title || `Image ${nasaId}`, 'en');

      canvas.setWidth(width as number);
      canvas.setHeight(height as number);

      if (thumbnailLink) {
        canvas.addThumbnail({
          id: thumbnailLink.href,
          type: 'Image',
        });
      }

      canvas.createAnnotation(`${manifestId}/c0/annotation`, {
        id: `${manifestId}/c0/annotation`,
        type: 'Annotation',
        motivation: 'painting',
        body: {
          id: originalLink.href,
          type: 'Image',
          format: 'image/jpg',
          height,
          width,
        } as any,
      });
    });
  });

  return builder.toPresentation3(builtManifest);
}
