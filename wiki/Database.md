## Database Structure

Below is the structure of the main database for this application. Try deploying this application - a similar structure will be created when data is inputted, and it is viewable in the Firebase console.

```bash
database
├── access
│   ├── approval
│   |   └── <email-of-approver>
│   |       └── <response-id>
│   |           └── form-id: <form-id>
│   ├── forms
│   |   └── formsbyid
│   |       └── <form-id>
│   |           └── <user-id>
│   |               ├── access: <access-credentials [view or edit]>
│   |               ├── email: <user-email>
│   |               └── role: <access-role [ownder or friend]>
│   |   └── formsbyuser
│   |       └── <user-id>
│   |           └── <form-id>
│   |               ├── access: <access-credentials [view or edit]>
│   |               ├── email: <user-email>
│   |               └── role: <access-role [ownder or friend]>
│   └── workflows
│       ├── workflowsbyid
│       |   └── <workflow-id>
│       |       └── <user-id>
│       |           ├── access: <access-credentials [view or edit]>
│       |           ├── email: <user-email>
│       |           └── role: <access-role [ownder or friend]>
│       └── workflowsbyuser
│           └── <user-id>
│               └── <workflow-id>
│                   ├── access: <access-credentials [view or edit]>
│                   ├── email: <user-email>
│                   └── role: <access-role [ownder or friend]>
├── forms
│   └── <form-id>
│       |── form: <form-data-for-rendering>
│       |── name: <form-name>
│       |── sharing: <form-sharing [private or public]>
│       |── time: <time-form-created>
│       └── workflow: <linked-workflow-id>
├── responses
│   └── <form-id>
│       └── <response-id>
│           |── comment: <reject-comment-string>
│           |── currentWorkflow: <emails-for-current-workflow>
│           |── data
│           |   |── 0
│           |   |   |── name: <name-of-input-field>
│           |   |   └── value: <value-of-input-field-data>
│           |   |── 1
│           |   |   |── name: <name-of-input-field>
│           |   |   └── value: <value-of-input-field-data>
|           |   └── ...
│           |── files
│           |   |── fileids
│           |   |   |── 0: <file-id>
│           |   |   |── 1: <file-id>
|           |   |   └── ...
│           |   |── filenames
│           |   |   |── 0: <file-name>
│           |   |   |── 1: <file-name>
|           |   |   └── ...
│           |   └── fileids
│           |       |── 0: <input=field-name>
│           |       |── 1: <input=field-name>
|           |       └── ...
│           |── notificationstatus: <status-of-email-notification [sent or pending]>
│           |── status: <status-of-response [pending or approved or rejected]>
│           |── time: <time-of-response-submission>
│           |── userId: <userId-of-user-submission>
│           |── workflow: <workflow-id-of-connected-workflow>
│           └── workflowChain
│               |── 0
│               |   |── name: workflow
│               |   └── value: <comma-seperated list of emails in given workflow>
│               |── 1
│               |   |── name: workflow
│               |   └── value: <comma-seperated list of emails in given workflow>
│               └── ...
├── users
│   └── <user-id>
│       |── email: <user-email>
│       |── firstname: <user-first-name>
│       |── lastname: <user-last-name>
│       |── name: <user-full-name>
│       |── notificationsettings
│       |   └── emailapprove: <workflow notification email send setting [true or false]>
│       |── responses
│       |   └── <formid>
│       |       └── <responseid>
│       |           |── comment: <reject-comment-string>
│       |           |── rejectedBy: <reject-user-email>
│       |           |── status: <response-status [approved or rejected or pending]>
│       |           └── time: <time-submitted [UTC time in seconds since 1970]>
│       └── username: <user-username>
└── workflows
    └── <workflow-id>
        |── name: <workflow-name>
        |── sharing: <workflow-sharing [private or public]>
        |── time: <time-workflow-created>
        └── workflow
                |── 0
                |   |── name: workflow
                |   └── value: <comma-seperated list of emails in given workflow>
                |── 1
                |   |── name: workflow
                |   └── value: <comma-seperated list of emails in given workflow>
                └── ...
```