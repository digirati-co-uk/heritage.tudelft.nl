import { html } from "hono/html";

export function cloverHtml() {
  return html`<!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0"
        />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Document</title>
        <script src="https://cdn.jsdelivr.net/npm/@samvera/clover-iiif@2.1.0/dist/web-components/index.umd.js"></script>
      </head>
      <body>
        <div id="viewer"></div>
        <script type="module">
          import { create } from "/client.js";

          let renderFn = null;
          const render = () => {
            if (renderFn) {
              renderFn();
            }
          };

          const $viewer = document.getElementById("viewer");
          const helper = create(window.location.origin, {
            ws: true,
            onChangeFile: render,
          });

          if (window.location.pathname === "/clover" || window.location.pathname === "/clover/") {
            $viewer.innerHTML = "No manifest selected";

            const index = await helper.getSitemap();
            if (index) {
              const $ul = document.createElement("ul");

              for (const [item, obj] of Object.entries(index)) {
                if (obj.type === "Collection") {
                  const $li = document.createElement("li");
                  $li.innerText = item;
                  $ul.appendChild($li);
                  continue;
                }
                const $li = document.createElement("li");
                const $a = document.createElement("a");
                $a.setAttribute("href", "/clover/" + item);
                $a.innerText = item;
                $li.appendChild($a);
                $ul.appendChild($li);
              }

              $viewer.innerHTML = "";
              $viewer.appendChild($ul);
            }
          } else {
            renderFn = async () => {
              const sliced = window.location.pathname.replace("/clover", "");
              const manifest = await helper.getManifest(sliced);
              if (manifest) {
                $viewer.innerHTML = "";
                const clover = document.createElement("clover-viewer");
                clover.setAttribute("id", manifest);
                $viewer.appendChild(clover);
              } else {
                $viewer.innerHTML = "Manifest not found";
              }
            };
            renderFn();
          }
        </script>
      </body>
    </html>`;
}
