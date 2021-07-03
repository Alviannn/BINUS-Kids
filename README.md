## BINUS Kids

This is a discord bot that scrapes data from BINUS website (binmay).<br>

Features:
* Get class schedules
* Get recently posted assignments
* Get recently posted forums

#### Configuration Examples:

1. Example `.env` file:
    ```env
    TOKEN=discord bot token
    BINUS_USER=my email
    BINUS_PASS=my password
    ```

2. Example `config.json` file:
    ```json
    {
        "prefix": "the bot prefix",
        "user_mention": "the user id to be mentioned every events (like schedules, assignments, and forums)",
        "channels": {
            "schedules": "channel id to post schedules",
            "assignments": "channel id to post assignments",
            "forums": "channel id to post forums"
        }
    }
    ```