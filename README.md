#Tamabotchi
This is a Tamagochi-like bot for Facebook messenger. Feed at your own risk.

##Install / Run
1. Clone the repo `git clone https://github.com/dev-labs-bg/tamabotchi`
2. Install the dependencies `node install` 
3. Install and start mongodb. On Arch:
    1. Install `sudo pacman -S mongodb`
    2. Start `sudo systemctl start mongodb`
    3. Autostart (on boot) `sude systemctl enable mongodb`
4. Create a new app from [FB's website][FB_DEV]
5. Add a `config.json` file, containing:
    * `fb`
        * `access_token`
        * `verification_token`
        * `api_endpoint`
        * `webhook_endpoint`
    * `mongodb_url`
6. Run with `node tamabotchi.js`

[FB_DEV]: https://developers.facebook.com/quickstarts/?platform=web
