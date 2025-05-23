import { html } from "hono/html";

export function indexHtml() {
  return html`<!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
        />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Headless static site</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/0.3.2/js/sql.js"></script>
      </head>
      <body class="p-5">
        <h1 class="text-3xl  mb-5 pb-5 border-b-2">Headless static site</h1>

        <input
          type="text"
          id="search"
          class="w-full p-2 rounded border border-slate-300 mb-5"
          placeholder="Search for a manifest..."
        />
        <div id="search_results"></div>

        <section class="my-5 rounded">
          <h3 class="text-xl mb-4">Links</h3>
          <ul class="ml-3">
            <li>
              <a class="text-blue-800 font-bold hover:underline" href="/explorer">IIIF Browser</a>
            </li>
            <li>
              <a class="text-blue-800 font-bold hover:underline" href="/clover">Clover</a>
            </li>
            <li>
              <a class="text-blue-800 font-bold hover:underline" href="#list">Index</a>
            </li>
          </ul>
        </section>

        <section class="my-5 rounded">
          <button id="full-rebuild">Full rebuild</button>
        </section>

        <section class="my-5 rounded">
          <h3 class="text-xl mb-4">Configuration</h3>
          <pre id="config" class="rounded bg-slate-200 p-4 text-slate-800"></pre>
        </section>

        <section class="my-5 rounded">
          <h3 class="text-xl mb-4">Index</h3>
          <div id="list"></div>
        </section>

        <script type="module">
          import { create } from "/client.js";

          const origin = window.location.origin;
          const helper = create(window.location.origin, {
            ws: true,
            onFullRebuild: () => {
              render();
            },
          });

          const $button = document.getElementById("full-rebuild");
          $button.addEventListener("click", async () => {
            await fetch("/build", { method: "POST", body: JSON.stringify({ cache: false }) });
          });

          render();

          async function render() {
            const index = await helper.getSitemap();
            const editable = await helper.getEditable();
            const $list = document.getElementById("list");
            const $config = document.getElementById("config");

            const stores = await helper.getStores();
            const slugs = await helper.getSlugs;

            $config.innerText = JSON.stringify(
              {
                stores,
                slugs,
              },
              null,
              2
            );

            if (index) {
              const $ul = document.createElement("ul");

              for (const [item, obj] of Object.entries(index)) {
                if (obj.type === "Collection") {
                  // const $li = document.createElement('li');
                  // $li.innerText = item;
                  // $ul.appendChild($li);
                  continue;
                }

                const overrides = obj.source.overrides;
                const l = "text-blue-800 hover:underline text-sm";
                const $li = document.createElement("li");

                $li.className = "mb-1 p-1 hover:bg-slate-100 flex items-center gap-3";
                const relativeUrl = await helper.getManifest(item);
                const url = origin + relativeUrl;
                $li.innerHTML =
                  (!url
                    ? ""
                    : '<a href="' +
                      url +
                      "?manifest=" +
                      url +
                      '" target="_blank" class="' +
                      l +
                      '"><img src="https://iiif.io/assets/uploads/logos/logo-iiif-34x30.png" class="w-4"/></a>') +
                  '<span class="text-slate-700 font-bold">' +
                  (obj.label || item) +
                  "</span>" +
                  '<a class="' +
                  l +
                  '" target="_blank" href="https://theseusviewer.org?iiif-content=' +
                  url +
                  '&ref=hss">[view]</a>' +
                  (overrides ? '<a class="' + l + '" href="/editor/' + item + '#copy">[save copy]</a>' : "") +
                  (editable[item] ? '<a target="_blank" class="' + l + '" href="https://manifest-editor.digirati.services/editor/external?manifest=' + url + '">[edit]</a>' : "");

                $ul.appendChild($li);
              }

              $list.innerHTML = "";
              $list.appendChild($ul);
            }
          }
        </script>

        <script>
          const $search = document.getElementById("search");
          const $results = document.getElementById("search_results");
          fetch("/meta/manifests.db").then(async (r) => {
            const database = new SQL.Database(new Uint8Array(await r.arrayBuffer()));
            window.DB = database;

            $search.addEventListener("keyup", (e) => {
              const q = e.target.value;
              $results.innerHTML = "";
              if (q) {
                const results = database.exec(
                  "SELECT id, label, slug, thumbnail FROM manifests WHERE label LIKE '%" + q + "%' LIMIT 10"
                );
                for (const result of results[0].values) {
                  const [id, label, url, thumbnail] = result;
                  const $li = document.createElement("li");
                  $li.className = "mb-1 p-1 hover:bg-slate-100 flex items-center gap-3";
                  $li.innerHTML =
                    (thumbnail ? '<img src="' + thumbnail + '" class="w-8" />' : "") +
                    '<a class="text-blue-800 font-bold hover:underline" href="/clover/' +
                    url +
                    '">' +
                    label +
                    "</a>";
                  $results.appendChild($li);
                }
              }
            });
          });
        </script>
      </body>
    </html> `;
}
