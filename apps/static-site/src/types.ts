declare module "@iiif/presentation-3" {
  interface _Collection {
    "hss:slug": string;
    "hss:totalItems"?: number;
    background?: string;
    items: Array<
      CollectionItems & {
        background?: string;
        "hss:slug": string;
        "hss:totalItems"?: number;
      }
    >;
    partOf?: Array<
      CollectionItems & {
        "hss:slug": string;
        "hss:totalItems"?: number;
        background?: string;
      }
    >;
  }
  interface _Manifest {
    "hss:slug": string;
  }
}
