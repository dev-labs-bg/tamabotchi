#Tamabotchi
This is a Tamagochi-like bot for Facebook messenger. Feed at your own risk.

##Install / Run
1. Clone the repo `git clone https://github.com/dev-labs-bg/tamabotchi`
2. Install libgd **BEFORE** `node install`
    * On Debian/Ubuntu `sudo apt-get install libgd2-dev`
    * On RHEL/CentOS `sudo yum install gd-devel`
    * On Arch `sudo pacman -S gd`
    * For more info check out the [Github repository][ligbd-github]
3. Install the dependencies `node install` 
4. Install and start mongodb. On Arch:
    1. Install `sudo pacman -S mongodb`
    2. Start `sudo systemctl start mongodb`
    3. Autostart (on boot) `sude systemctl enable mongodb`
5. Create a new app from [FB's website][fb-dev]
6. Add a `config.json` file, containing:
    * `FB`
        * `ACCESS_TOKEN`
        * `VERIFICATION_TOKEN`
    * `DB`
        * `MONGO_URL`
        * `SYNC_SCHEDULE` (e.g. `at 00:00` [More details][later-docs])
    * `BOTKIT_PORT` (Port for botkit server, webhook is at 
       [/facebook/receive][#])
    * `WEB`
        * `PORT`
        * `ROOT_URL`
        * `PUBLIC_ROOT`
7. Run with `node tamabotchi.js`

[libgd-github]: https://github.com/y-a-v-a/node-gd
[fb-dev]: https://developers.facebook.com/quickstarts/?platform=web
[later-docs]: https://bunkat.github.io/later/parsers.html#text
