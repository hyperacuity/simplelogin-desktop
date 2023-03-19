const { app, shell, nativeTheme } = require('electron')
const { Menu, MenuItem } = require('electron')


module.exports.createMenu = (win) => {
  const menu = new Menu()

  menu.append(new MenuItem({
    label: 'Navigation',
    submenu: [{
      label: "Notifications",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'Ctrl+Shift+F',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/notifications") }
    }, {
      type: 'separator'
    }, {
      label: "Alias",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+A' : 'Ctrl+Shift+A',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/") }
    }, {
      label: "Subdomains",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+S' : 'Ctrl+Shift+S',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/subdomain") }
    }, {
      label: "Mailboxes",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+W' : 'Ctrl+Shift+W',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/mailbox") }
    }, {
      label: "Domains",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+D' : 'Ctrl+Shift+D',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/custom_domain") }
    }, {
      label: "Directories",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+E' : 'Ctrl+Shift+E',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/directory") }
    }, {
      label: "Settings",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+Q' : 'Ctrl+Shift+Q',
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/setting") }
    }, {
      type: 'separator'
    }, {
      label: "API Access",
      click: () => { win.loadURL("https://app.simplelogin.io/dashboard/api_key") }
    }, {
      label: "Logout",
      click: () => { win.loadURL("https://app.simplelogin.io/auth/logout") }
    }, {
      type: 'separator'
    }, {
      /*role: 'quit',*/
      label: "Quit",
      accelerator: 'Ctrl+Q',
      click: () => {
        win.close()
        app.quit()
      }
    }]
  }))

  menu.append(new MenuItem({
    label: "Help",
    submenu: [{
      label: "Toggle Developer Tools",
      accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+I' : 'Ctrl+Shift+I',
      click: () => { win.webContents.toggleDevTools() }
    }, {
      label: "Toggle Theme",
      click: () => {
        if (nativeTheme.themeSource == "dark") {
          nativeTheme.themeSource = "light"
        } else {
          nativeTheme.themeSource = "dark"
        }
        win.reload()
      }
    }, {
      /*role: 'reload',*/
      label: "Reload",
      accelerator: 'F5',
      click: () => { win.reload() }
    }, {
      type: 'separator'
    }, {
      /*role: 'about',*/
      label: "About",
      click: () => { win.loadURL("local:///about.html") }
    }, {
      label: "Website",
      click:() => { shell.openExternal("https://github.com/hyperacuity/simplelogin-desktop#readme")}
    }]
  }))

  return menu;
}
