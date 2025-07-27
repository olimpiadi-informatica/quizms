# Create the Project

QuizMS uses several Firebase services:
  - Firestore for the database;
  - Storage for saving texts;
  - Hosting for the website;
  - Authentication for user authentication.

The simplest way to configure them is by using the Firebase web interface.

## Prerequisites

Install [Firebase CLI](https://firebase.google.com/docs/cli) and [Google Cloud SDK](https://cloud.google.com/cli):

  - Arch Linux:
      - [firebase-tools](https://aur.archlinux.org/packages/firebase-tools/) or [firebase-tools-bin](https://aur.archlinux.org/packages/firebase-tools-bin/)
      - [google-cloud-cli](https://aur.archlinux.org/packages/google-cloud-cli)
  - macOS:
    ```sh
    $ brew install firebase-cli google-cloud-sdk
    ```
  - Manual installation:
      - [firebase-cli](https://firebase.google.com/docs/cli#install_the_firebase_cli)
      - [google-cloud-sdk](https://cloud.google.com/sdk/docs/install)

## Create a New Project on Firebase

1.  Go to the [Firebase console](https://console.firebase.google.com/) and click on *"Add project"*.
2.  Once the project is created, on the home page, click the button with the code symbol to add a web app.
3.  Use the nickname "web" and click *"Register app"*.
4.  Copy the Firebase configuration object and paste it into the `firebase-config.js` file of the project.

## Configure Firestore

1.  Access the Firebase console;
2.  Go to all products;
3.  Go to Cloud Firestore;
4.  Click on *"Create database"*;
5.  Choose the location `europe-west6` (Zurich) and click *"Next"*;
6.  Select *"production mode"* and click *"Create"*;

## Configure Storage

1.  Access the Firebase console;
2.  Go to all products;
3.  Go to Storage;
4.  Click on *"Get started"*;
5.  Select `europe-west6` and click *"Continue"*;
6.  Select *"production mode"* and click *"Create"*;

## Configure Authentication

1.  Access the Firebase console;
2.  Go to all products;
3.  Go to Authentication;
4.  Click on *"Get started"*;
5.  Select *"Email/password"* from the native providers;
6.  Enable *"Email/password"* and click *"Save"*;
7.  Click "Add new provider";
8.  Select *"Anonymous"* from the native providers;
9.  Enable *"Anonymous"* and click *"Save"*;
10. Go to the *"Settings"* tab and in the *"User actions"* section, disable *"Email enumeration protection"*;

## Configure Hosting

1.  Access the Firebase console;
2.  Go to all products;
3.  Go to Hosting;
4.  Click on *"Get started"*;
5.  Ignore all steps and click *"Next"* until you reach the end;
6.  To configure the domain, go to *"Add custom domain"* and follow the instructions. The domain must be configured **at least 24 hours** before the start of the contest.

## Select the Paid Plan

1.  Access the Firebase console;
2.  At the bottom left, next to the word "Spark", click *"Upgrade"*;
3.  Choose the Blaze pay-as-you-go plan and set up payment.

## Complete the Configuration

1.  Authenticate with Google Cloud:
    ```sh
    $ gcloud auth application-default login
    ```
2.  Initialize the local project:
    ```sh
    $ npx quizms firebase init
    ```
3.  Upload security rules and indexes:
    ```sh
    $ firebase deploy --only firestore,storage
    ```