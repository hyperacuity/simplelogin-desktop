const { app, shell, session, protocol } = require('electron')
const { BrowserWindow, Notification, Menu, nativeTheme } = require('electron')

const { autoUpdater } = require("electron-updater")

const path = require('node:path')
const url = require('node:url')

const { createMenu } = require("./menu.js")
const { registerDebugger } = require("./debugger.js")

// add logic to block second instances 
// (because chrome is so fucking slow to load)
app.requestSingleInstanceLock()
var win = null

app.on('second-instance', (event, cmd, cwd, data) => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on("will-quit", () => {
  // just in case
  app.releaseSingleInstanceLock()
})

if (app.hasSingleInstanceLock() == false) {
  app.quit()
  process.exit()
}

// tell electron to not add the default menu
Menu.setApplicationMenu(null)

// check for updates
autoUpdater.checkForUpdates().then((res) => {
    if(res) {
      console.log("current:", app.getVersion())
      console.log("update:", res["updateInfo"]["version"])
      
      res["downloadPromise"].then((com) => {
        console.log(com);

        new Notification({ 
          title: "SimpleLogin Desktop", 
          body: "A new update has been downloaded.\nRestart to apply changes!" 
        }).show()
      })
    }
})

async function createWindow() {
  // retrieve cookie to prevent overwriting dark mode
  const dmc = await session.defaultSession.cookies.get({ url: "https://app.simplelogin.io/", name: 'dark-mode' })

  if (dmc.length > 0) { // if cookie exists
    if (dmc[0]["value"] === "true") {
      nativeTheme.themeSource = "dark"
    } else {
      nativeTheme.themeSource = "light"
    }
  } else {
    // use system recommendation when cookie is unavailable 
    nativeTheme.themeSource = (nativeTheme.shouldUseDarkColors) ? 'dark' : 'light'
  }

  // define initial window background color
  const color = ((nativeTheme.themeSource === "dark") ? '#1a1a1a' : '#ffffff')

  win = new BrowserWindow({
    width: 1000,
    height: 780,
    minWidth: 480,
    minHeight: 625 + 25,
    show: false,
    backgroundColor: color
  })

  const menu = createMenu(win)
  win.setMenu(menu)

  // look at debugger.js to see why this is needed
  registerDebugger(win.webContents)

  // prevent links from opening in an uncontrolled electron window
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url) // open in default app instead
    return { action: "deny" }
  })

  win.loadURL("https://app.simplelogin.io/")

  // only show window after webpage finished loading
  win.once('ready-to-show', () => {
    win.show()
  })
}

app.on('ready', async () => {
  registerProtocol()
  registerHeaderListeners()
  // start building main window
  await createWindow()
})


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// register custom protocol for loading injected content
function registerProtocol() {
  protocol.registerFileProtocol('local', (request, callback) => {
    const location = url.parse(request.url).pathname

    const base = path.join(__dirname, "renderer/")
    const full = path.normalize(path.join(base, location))

    if (full.startsWith(base)) callback(full)
  })
}

// stop csp from blocking it (before ready event)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { bypassCSP: true } }
])

function registerHeaderListeners() {
  const filter = {
    urls: ["https://app.simplelogin.io/"] //, "*://*/*"
  }

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {

    // overwrite the user-agent header if it exists
    if (details.requestHeaders.hasOwnProperty('User-Agent')) {
      details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
    }

    // remove leaking headers
    delete details.requestHeaders['sec-ch-ua-platform']
    delete details.requestHeaders['sec-ch-ua']
    delete details.requestHeaders['sec-ch-ua-mobile']

    //console.log("req:", details.url, details.requestHeaders)
    callback({ requestHeaders: details.requestHeaders })
  })

  /*session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
      
      delete details.responseHeaders["Expect-CT"] // deprecated

      //console.log("res:", details.url, details.responseHeaders)
      callback({ responseHeaders: details.responseHeaders })
  })*/
}