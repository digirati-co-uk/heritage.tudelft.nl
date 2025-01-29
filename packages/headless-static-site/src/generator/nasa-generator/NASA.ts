import type {
  AssetResponse,
  CollectionResponse,
  SearchCollectionItem,
  SearchParams,
} from "./NASA.types";
import { queryStringStringify } from "./query-string-stringify";

export class NASA {
  static BASE_URL = "https://images-api.nasa.gov";

  fetcher: any;

  constructor(fetcher: any) {
    this.fetcher = fetcher;
  }

  async search(
    params: SearchParams,
  ): Promise<CollectionResponse<SearchCollectionItem>> {
    const reqUrl = new URL(`${NASA.BASE_URL}/search`);
    reqUrl.search = queryStringStringify(params);

    const response = await fetch(reqUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    return (await response.json()) as any;
  }

  async asset(nasa_id: string): Promise<AssetResponse> {
    return this.fetcher(`${NASA.BASE_URL}/asset/${nasa_id}`, {
      headers: { Accept: "application/json" },
    });
  }
  async assetMetadata(nasa_id: string) {
    return this.fetcher(`${NASA.BASE_URL}/asset/${nasa_id}/metadata.json`, {
      headers: { Accept: "application/json" },
    });
  }
  async link<T>(_link: string): Promise<T> {
    const url = new URL(_link);
    url.protocol = "https";
    const link = url.toString();

    return this.fetcher(link, { headers: { Accept: "application/json" } });
  }
}
