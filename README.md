<h1 align="center">
  Delft Static Site Generator
</h1>

## 💫 About

Since 2017, when TU Delft celebrated its 175th anniversary, the university has been raising the profile of its academic heritage by systematically curating its collections, initiating research projects and organising on-campus presentations in collaboration with students and academic staff.

This website provides access to the different facets of the academic heritage team of TU Delft Library: digital editions of exhibitions, (digitised) items from the special collections and research output.

## 🚀 Developing locally

1.  **Dependancies**

    [pnpm](https://pnpm.io/installation)

    pnpm is a fast javascript package manager similar (and compatible) with npm.

    ```sh
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```

2.  **Start developing.**

    From the route of the project install the latest project dependancies and start the development server.

    ```sh
    pnpm install
    ```

    then run a first build, to create the IIIF:

    ```sh
    pnpm run build
    ```

    to start the development server run

    ```sh
    pnpm dev
    ```

3.  **Open the source code and start editing!**

    Your site is now running at `http://localhost:3000`!

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
