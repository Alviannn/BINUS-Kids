## BINUS Kids

This is a discord bot to receive BINUS class related updates.
`NOTE: I will always make the codes of this bot to adapt to my own classes, so yeah`

##### Configuration Examples:

1. Example .env:
    ```env
    TOKEN=discord bot token
    ```

2. Example config.json:
    ```json
    {
        // the default prefix for the bot commands
        "default-prefix": "--",
        // all of the binus accounts will be stored here
        "binus-accounts": {
            // the first account id (customizable, ex: wakanda-foreva)
            "wakanda-foreva": {
                "username": "user.name",
                "password": "pass123"
            },
            // the second account id (customizable, ex: weeb's account)
            "weeb's account": {
                "username": "user.name",
                "password": "pass123"
            }
        },
        "servers": {
            // the first server id
            "server id 1": {
                // custom prefix command only for this server (optional)
                "prefix": "!",
                // the channel id to post class schedules (required)
                "schedules_channel": "channel id",
                // the channel id to post class assignments (required)
                "assignments_channel": "channel id",
                // the channel id to post class forums (required)
                "forums_channel": "channel id",
                // the account id to be used from 'binus-accounts' (required)
                "use-account": "wakanda-foreva"
            },
            // the second server id
            "server id 2": {
                "schedules_channel": "channel id",
                "assignments_channel": "channel id",
                "forums_channel": "channel id",
                "use-account": "weeb's account"
            }
        }
    }
    ```