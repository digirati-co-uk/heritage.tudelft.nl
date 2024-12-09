import { extract } from "../lib/scripts";

extract(
  {
    id: "testing-js-extract",
    name: "testing js extract",
    types: ["Manifest"],
  },
  async (resource, api) => {
    return {};
  },
);
