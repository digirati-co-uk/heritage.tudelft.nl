declare module "@iiif/presentation-3" {
  interface _Collection {
    "hss:slug": string;
    "hss:totalItems"?: number;
    items: Array<
      CollectionItems & {
        "hss:slug": string;
        "hss:totalItems"?: number;
      }
    >;
  }
  interface _Manifest {
    "hss:slug": string;
  }
}
