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
        "prefix": "--",
        "channels": {
            "schedules": "channel id",
            "assignments": "channel id",
            "forums": "channel id"
        }
    }
    ```