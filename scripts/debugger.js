const { app } = require('electron')

// We are forced to use the debugger,
// because this horrible browser does not have any other way to intercept and modify http responses.
// There is a (to me unnoticeable) performance penalty caused by this approach.
// This ability is used to remove analytics, 
// tracking and any blinking caused by traditional injection using electron.
// (because the changes made in a preload script do not actually propagate before load, duh...)

/*
  https://stackoverflow.com/questions/18310484/modify-http-responses-from-a-chrome-extension
  https://www.electronjs.org/docs/latest/api/debugger
  https://chromedevtools.github.io/devtools-protocol/tot/Fetch/
*/

module.exports.registerDebugger = async (contents) => {
    try {
        contents.debugger.attach("1.1")
    } catch (err) {
        console.error('Debugger failed to attach:', err)
    }

    contents.debugger.on('detach', (event, reason) => {
        if (reason !== "target closed") {
            console.log('Debugger detached unexpectedly:', reason, event)
        }
    })

    const rules = [{
        pattern: ["https://app.simplelogin.io/"],    // matching domains and locations
        status: [200],                               // required status codes
        content: ["text/html"],                      // required response resource types
        matches: [
            // Newrelic analytics (inline, third-party)
            { pat: /(\<script.*window\.NREUM.*\<\/script>)/gm, rep: "" },
            // Plausible analytics (linked, self-hosted)
            {
                pat: `<script src="/static/js/an.js?v=2"></script>`,
                rep: `<script src="local:///injected.js"></script>`
            },
            // Sentry monitoring (inline, third-party)
            { pat: /(Sentry\.init\([\w\W]*?\}\);)/gm, rep: "" },
            {
                pat: `<script src="/static/node_modules/%40sentry/browser/build/bundle.min.js"></script>`,
                rep: `<link href="local:///styling.css" rel="stylesheet">`
            },
            { pat: `console.log("Init sentry");`, rep: "" },
            // Shields badge in footer (linked, external)
            { pat: /\<img src\=\"https\:\/\/img\.shields\.io[\w\W]*?\>/gm, rep: "" },
        ]
    }, {
        pattern: ["https://app.simplelogin.io/dashboard/setting"],
        status: [200],
        content: ["text/html"],
        matches: [
            // disable deleting account (does simplelogin use different locales?)
            {
                pat: "If SimpleLogin isn't the right fit for you, you can simply delete your account.",
                rep: "You can not delete your account in this third-party desktop app. Please use your browser instead."
            },
            { pat: /\<a.*?\/dashboard\/delete_account[\w\W]*?\<\/a\>/gm, rep: "" }
        ]
    }, {
        pattern: [/https:\/\/app\.simplelogin\.io\/(?!.*\bdashboard\/notifications\b).*/gm],
        status: [200],
        content: ["text/html"],
        matches: [
            // remove unnecessary api call (caused by original notification handler)
            // on all pages except the notification page
            { pat: /let.res[\w\W]*?\/api\/notifications[\w\W]*?\}\)\;/gm, rep: "let res = {ok: false};" }
        ]
    }, {
        pattern: ["local:///version.js"],
        status: [200],
        content: ["text/javascript"],
        matches: [
            // sorry, i am too lazy to do ipc for a version number lol
            {pat: "APPVERSION", rep: app.getVersion()}
        ]
    }]

    // maybe modify https://app.simplelogin.io/static/js/theme.js


    contents.debugger.on('message', async (event, method, params) => {
        if (method === "Fetch.requestPaused") {

            //console.log(params.request["url"])
            let rulebook = []

            for (const idx in rules) {
                const rule = rules[idx]

                // Match status
                if (rule["status"].includes(params.responseStatusCode) || rule["status"] === "any") {
                    const headers = params.responseHeaders
                    const cth = headers.filter(obj => obj["name"] === "Content-Type")
                    const mime = cth.map(obj => obj["value"].split(";")[0])[0]

                    // Match mime
                    if (rule["content"].includes(mime) || rule["content"].includes(params.resourceType.toLowerCase())) {
                        //console.log(params.request["url"] /*, params*/)
                        //console.log(rule["pattern"])

                        const matching = rule["pattern"].map(obj => params.request["url"].search(obj)).filter(obj => obj >= 0)
                        // Match pattern
                        if (matching.length > 0) {
                            rulebook = rulebook.concat(rule["matches"])
                        }
                    }
                }
            }


            if (rulebook.length > 0) {
                //console.log(rulebook)
                const res = await event.sender.sendCommand("Fetch.getResponseBody", { requestId: params.requestId })

                let body = res.body
                if (res.base64Encoded) {
                    body = Buffer.from(res.body, 'base64').toString('utf-8')
                }

                let news = body
                for (const idx in rulebook) {
                    const pair = rulebook[idx]
                    //console.log(pair)
                    news = news.replace(pair["pat"], pair["rep"])
                }

                if (res.base64Encoded) {
                    news = Buffer.from(news, 'utf-8').toString("base64")
                }

                await event.sender.sendCommand("Fetch.fulfillRequest", {
                    requestId: params.requestId,
                    responseHeaders: params.responseHeaders,
                    responseCode: params.responseStatusCode,
                    body: news
                })
                return
            }

            await event.sender.sendCommand("Fetch.continueRequest", { requestId: params.requestId })
        }
    })

    // register intercept
    await contents.debugger.sendCommand('Fetch.enable', { patterns: [/*{requestStage: "Request"},*/{ requestStage: "Response" }] })
}
