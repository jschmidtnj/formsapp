# formsapp

This application is created with Firebase, Bootstrap, Vuejs, jQuery formbuilder, and vanilla html. No framework was used, due to initial compatability issues. The goal is for the frontend to be serverless, and to use cloud-functions to fill in the gaps. In order for this website to have secure database calls without a server, database rules were added in firebase to ensure that only users who login from a verified domain email have the ability to view response data. Follow the steps below for installation and testing.

## generate static distribution files

First clone the repository (it works best in linux): `git clone --recursive https://<github-account-name>:<github-account-token>@github.com/<organization-name>/formsapp.git && cd wiki && git pull origin master && cd .. && ls`.  
Then install [yarn](https://yarnpkg.com/lang/en/docs/install/#debian-stable).  
Run `yarn` in the main directory.  
Finally `dist/index.html` in a web-browser and make sure the splash page works.  

## edit configuration file

Open `src/config/config.json` in a text editor. Go to [firebase](https://console.firebase.google.com) and create a new project. Then in `Project Overview`, click `</>` to add a web app. Copy the fields in the `var config`, and paste the values in the `src/config/config.json` `firebase` section. Next edit the `companyemailregex` to include regex that matches your company's email address (`^.*@gmail.com$` only allows gmail accounts to see response data). Finally, edit the values in `other` as needed.

## edit CORS

The file `cors.json` is needed to allow file downloads from Firebase Storage. To configure CORS, download the [gsutil utility](https://cloud.google.com/storage/docs/gsutil_install) on your computer (again, linux preferred), and run `gcloud init` to sign in. Then run `export BOTO_CONFIG=/dev/null` on linux to prevent a bug in the program. Finally, run `gsutil cors set rules/cors.json gs://<your-cloud-storage-bucket>` in the parent directory to add the CORS rules, obviously changing the command for your storage bucket.

## edit firebase rules

The file `database.rules.json` contains obviously the rules for users to access the database. It is fairly self-explanatory, and the only thing you have to change is `auth.token.email.matches(/.*@gmail.com$/)` to your company's regex email address domains. Any field with this rule added protects the data from being accessed by users with outside email address domains. `firebase.indexes.json` can be changed to add new indexes, which is important for speeding-up queries. `firestore.rules` can be left alone, along with storage.rules.json, because these files are not being used. `storage.rules` must be changed to include your company's email address domain regex in the expression `request.auth.token.email.matches(".*@gmail.com$")` to prevent people outside the company from uploading and downloading maliciously.

## update rules in firebase

Copy the contents of the file `database.rules.json` to the Database rules under `Database > Realtime Database > Rules`.  
Copy the contents of the file `storage.rules` to the Storage rules under `Storage > Rules`.

## run locally

To just use the static files locally, install nodejs and npm [here](https://nodejs.org/en/download/package-manager/). Then run `npm install` in the same directory as `package.json`, followed by `npm run build`. This should generate static files in the `dist` folder (it usually takes a few minutes). Open some of the files in your web browser.  
**Note:** Social login will not work with just opening the static files - a web server is needed. Email sign-in, however, will work.

## run on nginx (or any web server)

To run the website on an nginx webserver, download Nginx ([here](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-16-04) are instructions for downloading on Ubuntu 16.04) and point the web server to the `dist` folder. You can use the example configuration file `nginx.conf`. Installing on a server works in the exact same way, except you just go to the server's ip address.

## deploy firebase functions

To start, install firebase tools: `npm install -g firebase-tools`. Login to the email used with your firebase account with `firebase login --interactive` (graphical login) or `firebase login --no-localhost` (terminal login). Then run `firebase deploy --only functions` to add the functions.

## run on firebase hosting

Firebase hosting was used in the deployment of this project because it keeps everything in one place, is cheap, and works relatively well compared to other options. To start, install firebase tools: `npm install -g firebase-tools`. Then login to the email used with your firebase account with `firebase login --interactive` (graphical login) or `firebase login --no-localhost` (terminal login). Then run `firebase deploy` to deploy the entire app to firebase. Go to the outputted URL to verify it worked.

## add custom url

To add a custom URL, navigate to the `hosting` page and click `add domain`. Then configure your DNS rules wherever your domain name is hosted, and soon you'll be all set. There are plenty of free urls (my favorite website for this is [freenom](http://freenom.com/)) for you to get started.

## add google analytics

Navigate [here](https://analytics.google.com/analytics/web/provision). Sign up with the google account you used for your firebase app. Add the custom url you created as the website. Once all the terms are accepted, copy the global site tag url and paste it in every html file header located in `src/html/`.

## add cloud functions

There are a few cloud functions used in this project to provide email notifications with approvals / rejections and initial submissions to workflow. They are found in the `functions/index.js` file. The first function is `sendApprovalEmailNotification`, which sends an email at each change in approval in a workflow chain, to the next group of approvers. This way the next group of approvers is notified only when needed at the approval. The next function `sendApprovedRejectedEmailNotification` sends an email to the submitter of the form when the form is finally approved or rejected by the workflow chain. The function `accountcleanup` deletes accounts that were created but not verified, and is triggered by a cronjob. Run `firebase deploy --only functions` to deploy all of the functions. See below for cronjob information.

## add Cronjob to accountcleanup cloud function

Cloud Functions does not natively supports cron jobs. We are working around this by executing the code as an HTTPS-triggered function. Then simply use an external service to periodically "ping" the URL.

Here is a non-exhaustive list of external services for cron jobs:
 - https://cron-job.org/
 - https://www.setcronjob.com/
 - https://www.easycron.com/
 - https://zapier.com/zapbook/webhook/

### Trigger rules

The function triggers when the HTTP URL of the Function is requested.

### Deploy and test

Set the `cron.key` Google Cloud environment variables to a randomly generated key. This will be used to authorize requests coming from the 3rd-party cron service. For this use:

```bash
firebase functions:config:set cron.key="YOUR-KEY"
```

You can generate a random key, for instance, by running:

```bash
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
```

The url to use with cron jobs is as follows:

```url
https://us-central1-<PROJECT-ID>.cloudfunctions.net/accountcleanup?key=<YOUR-KEY>
```

## credits

Thank you [Chad](https://codepen.io/hellochad/pen/weMpgE) for your awesome 404 error page, and [BlackRockDigital](https://github.com/BlackrockDigital/startbootstrap-new-age) for the great Bootstrap template. For the icons and fonts, [icomoon](https://icomoon.io) is great paired with [fontawesome](https://fontawesome.com/).