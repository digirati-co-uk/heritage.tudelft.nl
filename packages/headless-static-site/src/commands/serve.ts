import { cwd } from 'process';
import { join } from 'node:path';
import { build } from './build.ts';
import { macro } from '../macro.ts' assert { type: 'macro' };
import { macro as macroDev } from '../macro.ts';
import { mkdirp } from 'mkdirp';
import { dirname } from 'path/posix';
import { existsSync } from 'node:fs';

interface ServeOptions {
  dev: boolean;
  scripts?: string;
}
export async function serve({ dev, scripts }: ServeOptions) {
  const options = {
    enrich: true,
    extract: true,
    emit: true,
    generate: true,
    cache: true,
    scripts,
  };

  const fullBuild = () => build({ dev: true, watch: false, ...options }, null as any);

  await fullBuild();

  const files = !dev
    ? await macro()
    : {
        // get client() {
        //   return macroDev().then((r) => r.client);
        // },
        get explorer() {
          return macroDev().then((r) => r.explorer);
        },
        get clover() {
          return macroDev().then((r) => r.clover);
        },
        get editor() {
          return macroDev().then((r) => r.editor);
        },
        get index() {
          return macroDev().then((r) => r.index);
        },
      };

  build(
    {
      dev: true,
      watch: true,
      skipFirstBuild: true,
      async onBuild() {
        editable = await Bun.file(join(cwd(), '.iiif/dev/build', '/meta/editable.json')).json();

        siteMap = await Bun.file(join(cwd(), '.iiif/dev/build', '/meta/sitemap.json')).json();
      },
      ...options,
    },
    null as any
  );

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let editable = await Bun.file(join(cwd(), '.iiif/dev/build', '/meta/editable.json')).json();

  let siteMap = await Bun.file(join(cwd(), '.iiif/dev/build', '/meta/sitemap.json')).json();

  console.log('Serving on http://localhost:7111');

  Bun.serve({
    port: 7111,
    async fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/favicon.ico') {
        return new Response('', { status: 404 });
      }

      if (url.pathname === '/client.js' || url.pathname === '/client.ts') {
        const local = existsSync(join(cwd(), 'build', 'client.js'));
        if (local) {
          const file = Bun.file(join(cwd(), 'build', 'client.js'));
          return new Response(file.stream(), {
            headers: { 'content-type': 'text/javascript', ...corsHeaders },
          });
        }

        try {
          const fromModule = require.resolve('iiif-hss/client');
          const file = Bun.file(fromModule);
          return new Response(file.stream(), {
            headers: { 'content-type': 'text/javascript', ...corsHeaders },
          });
        } catch (e) {
          console.log(e);
        }
      }

      if (url.pathname.startsWith('/explorer')) {
        return new Response(await files.explorer, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname.startsWith('/clover')) {
        return new Response(await files.clover, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname.startsWith('/editor/')) {
        return new Response(await files.editor, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname === '/') {
        return new Response(await files.index, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      const file = Bun.file(join(cwd(), '.iiif/dev/build', url.pathname));
      if (req.method === 'POST') {
        if (!url.pathname.endsWith('manifest.json')) {
          return new Response('', { status: 404 });
        }

        let withoutExt = url.pathname.replace(/\/manifest.json$/, '');
        if (withoutExt.startsWith('./')) {
          withoutExt = withoutExt.slice(2);
        }
        if (withoutExt.startsWith('/')) {
          withoutExt = withoutExt.slice(1);
        }

        const relativeWithoutExt = './' + withoutExt;
        let editablePath = editable[withoutExt] || editable[relativeWithoutExt];

        if (!editablePath) {
          const file = siteMap[withoutExt] || siteMap[relativeWithoutExt];
          if (!file?.source?.overrides) {
            return new Response('', { status: 404 });
          } else {
            editablePath = join(file?.source?.overrides, relativeWithoutExt + '.json');
          }
        }

        const body = await req.json();
        if (body) {
          await mkdirp(dirname(editablePath));

          await Bun.write(join(cwd(), editablePath), JSON.stringify(body, null, 2));
          await fullBuild();
          return new Response('ok');
        }
        return new Response('', { status: 404 });
      }

      return new Response(file.stream(), { headers: corsHeaders });
    },
  });
}
