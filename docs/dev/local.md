# Develop QuizMS

1.  Download and compile `quizms`:

    ```sh
    $ git clone git@github.com:olimpiadi-informatica/quizms.git
    $ pushd quizms
    $ yarn           # install dependencies
    $ yarn build     # compile the project, you can use `yarn watch` to automatically recompile
    $ yarn link      # create a symlink to quizms
    $ popd
    ```

2.  Download a project to test `quizms` on:

    ```sh
    $ git clone ...
    $ pushd ...
    $ yarn           # install dependencies
    $ yarn link @olinfo/quizms   # install the local version of quizms
    ```

3.  Start the development server:

    ```sh
    $ yarn dev
    ```