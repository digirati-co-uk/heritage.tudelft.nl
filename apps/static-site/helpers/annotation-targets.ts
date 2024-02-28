import { Vault } from "@iiif/helpers/vault";
import { AnnotationPage } from "@iiif/presentation-3";

export function getAnnotationTargets(vault: Vault, annotation: AnnotationPage) {
  // Grab the source
  // Source will be either:
  // - Canvas target
  // - Annotation ON the canvas.
  //
  // We need to return:
  // - {x, y, width, height} relative to the canvas
  // - label/summary of the annotation (either the original OR the target)
  // -

  return [];
}
