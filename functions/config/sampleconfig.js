var config = {
    "mailjet": {
        "mailjetapikey": "key",
        "mailjetapisecret": "secret"
    },
    "firebaseadmin": {
        "type": "service_account",
        "project_id": "app",
        "private_key_id": "key",
        "private_key": "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
        "client_email": "email@app.iam.gserviceaccount.com",
        "client_id": "123456789",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "url"
    },
    "approvalNotificationEmailData": {
        "FromEmail": "email@example.com",
        "FromName": "Forms App"
    },
    "approvedNotificationEmailData": {
        "FromEmail": "email@example.com",
        "FromName": "Forms App"
    },
    "rejectedNotificationEmailData": {
        "FromEmail": "email@example.com",
        "FromName": "Forms App"
    },
    "other": {
        "databaseurl": "url",
        "maxconcurrentaccountdeletions": "3",
        "daysofinactivity": "1",
        "cronjoburl": "https://app.cloudfunctions.net/accountcleanup?key=key",
        "indexaddress": "https://formsapp-9fe5b.firebaseapp.com/",
        "logoimagesrc": "assets/images/colpallogo_red.png",
        "heroimagesrc": "assets/images/emailheroimage.png",
        "privacypolicyurl": "https://www.colgatepalmolive.com/en-us/legal-privacy-policy/privacy-policy",
        "termsofserviceurl": "https://shop.colgate.com/pages/terms-of-service",
        "address": "909 River Rd, Piscataway Township, NJ 08854",
        "phonenumber": "(732) 878-7500"
    }
}

module.exports = config;