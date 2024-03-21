declare module "@iiif/presentation-3" {
  interface _Collection {
    "hss:slug": string;
    items: Array<
      CollectionItems & {
        "hss:slug": string;
      }
    >;
  }
  interface _Manifest {
    "hss:slug": string;
  }
}
