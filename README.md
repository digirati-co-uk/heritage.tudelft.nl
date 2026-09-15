<h1 align="center">
  Delft Static Site Generator
</h1>

## 💫 About

Source code for the special collections and academic heritage website of Delft University of Technology Library in the Netherlands. This website provides access to digital collections, exhibitions and publications, and is powered by the standards of the International Image Interoperability Framework (IIIF).

## 🚀 Developing locally

1.  **Dependancies**

    [pnpm](https://pnpm.io/installation)

    pnpm is a fast javascript package manager similar (and compatible) with npm.

    ```sh
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```

2.  **Start developing.**

    From the root of the project, install the latest project dependencies:

    ```sh
    pnpm install
    ```

    Then run a first build to create the IIIF output and the static site:

    ```sh
    pnpm run build
    ```

    The IIIF app depends on the local `iiif-hss` workspace package. The root
    build uses Turbo, so it builds `packages/headless-static-site` before
    `apps/iiif`; no second `pnpm install` should be needed after the build.

    If you only want to rebuild the IIIF output directly, include its workspace
    dependencies:

    ```sh
    pnpm --filter @repo/iiif... run build
    ```

    To start the development server run:

    ```sh
    pnpm dev
    ```

3.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:3000`!

## 🔎 Running search locally

The static site uses Typesense for search. By default, the development server uses the production search endpoint. To run it locally, start the
Typesense container from the monorepo root:

```sh
docker compose -f apps/static-site/docker-compose.typesense.yml up -d
```

This starts Typesense at `http://localhost:8108` with the API key `xyz`, and
the Typesense dashboard at `http://localhost:8109`. To make the local Next.js
app use that local index, add these values to `apps/static-site/.env.local` and
restart the dev server:

```sh
NEXT_PUBLIC_TYPESENSE_API_KEY=xyz
NEXT_PUBLIC_TYPESENSE_HOST=localhost
NEXT_PUBLIC_TYPESENSE_PORT=8108
NEXT_PUBLIC_TYPESENSE_PROTOCOL=http
NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME=manifests
```

Stop the local search containers with:

```sh
docker compose -f apps/static-site/docker-compose.typesense.yml down
```

### Updating the search index

The search index is managed by `apps/static-site/search-cli.ts`. The CLI expects
to run from `apps/static-site`, because it reads both IIIF metadata from
`../iiif/build` and content generated from `apps/static-site/publications`.
Its defaults match the local Docker setup: `TYPESENSE_API_KEY=xyz`,
`TYPESENSE_HOST=localhost`, `TYPESENSE_PORT=8108`, `TYPESENSE_PROTOCOL=http`,
and `TYPESENSE_COLLECTION_NAME=manifests`. Set those non-`NEXT_PUBLIC`
variables before running the same commands if you need to target another
Typesense server.

Before updating the index, rebuild the generated data that should be indexed:

```sh
# From the monorepo root:
pnpm --filter @repo/iiif... run build

# If publication content changed:
cd apps/static-site
pnpm run build:content
```

Then update the local `manifests` collection:

```sh
cd apps/static-site
pnpm run search:manifests
```

Use `--recreate` when the schema changed or when you want a clean rebuild of
the collection:

```sh
pnpm run search:manifests --recreate
```

## 🧐 Directories?

The project is a [Monorepo](https://turbo.build/repo/docs) with multiple projects in the same repository. There are 2 main applications. The IIIF building pipeline and the static site. They can be found under the `apps` directory.

## 💫 Deploy

    Run auto linting on your code to conform to the project standards

    ```sh
    pnpm run lint
    ```

    Building the project. It is recommended you confirm the build is running and passing before any pushes to the project repository.

    ```sh
    pnpm run build
    ```

Once you have a running build push to the project repo and open a pull request. Netlify will automatically build a preview of your branch and the details are availible on the pull request if you add a label "Deploy preview" to the pull request.

Main branch is automatically deployed to the live site.

## Useful links

[UX Wireframe](https://www.figma.com/file/emiQTuM5feCweZT4soUY4MJg/Wires?node-id=0:1)

[Live site](https://heritage.tudelft.nl/)

[Changelog](https://github.com/digirati-co-uk/heritage.tudelft.nl/issues)

## Updating Headless Static Site

Ensure you have the headless static site origin:

```sh
git remote add -f hss git@github.com:digirati-co-uk/headless-static-site.git
```

Then you can pull changes using:

```sh
git subtree pull --prefix=packages/headless-static-site hss main
```

Or contribute changes back using:

```sh
git subtree push --prefix=packages/headless-static-site hss feature/my-feature
```

Where `feature/my-feature` is the name of a branch you want to push to the headless static site repository.

Read more about this process here: https://www.atlassian.com/git/tutorials/git-subtree
