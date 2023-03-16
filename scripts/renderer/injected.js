window.addEventListener("DOMContentLoaded", () => {
    console.log("Injected")
    console.warn("Do you know what you are doing here?\n Never enter text that you don't fully understand.")

    // refresh theme cookie
    setDarkMode(darkModePreference.matches)

    // auto-collapse explaination shown on some pages
    try {
        let hint = document.getElementById("howtouse")
        hint.classList.remove("show")
    } catch { }

    // make changes to navbar
    try {
        const nav = document.getElementsByClassName("nav nav-tabs")[0]

        // push notification icon to right side
        const spacer = `<li class="menu-spacer"></li>`
        nav.appendChild(document.createRange().createContextualFragment(spacer))

        // add new notifications
        const notifier = `<li class="nav-item"><a href="/dashboard/notifications" class="nav-link notif-link"><div class="notif-alerter"><i class="fe fe-alert-circle notif-icon"></i></div></a></li>`
        nav.appendChild(document.createRange().createContextualFragment(notifier))

        fetch("https://app.simplelogin.io/api/notifications?page=0", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
            .then((response) => response.json())
            .then((data) => {
                //data["more"] = true
                if (data["more"] === true || data["notifications"].length > 0) {
                    const alerter = document.getElementsByClassName("notif-alerter")[0]
                    alerter.classList.add('alerted')

                    if (["false", undefined].includes(getCookieLite("notified"))) {
                        let text = `You have ${data["notifications"].length}${data["more"] ? "+" : ""} unread notifications`
                        let notif = new this.Notification("SimpleLogin", { body: text })
                        notif.onclick = () => { 
                            window.location = "https://app.simplelogin.io/dashboard/notifications" 
                        }
                        setCookieLite("notified", "true", 1)
                    }

                } else  {
                    setCookieLite("notified", "false")
                }

            })
    } catch { }
})

const darkModePreference = window.matchMedia("(prefers-color-scheme: dark)")

const setCookieLite = (name, value, days = 9999) => {
    let date = new Date()
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000))

    let hostname = window.location.hostname
    let expiry = date.toUTCString()
    document.cookie = `${name}=${value}; Expires=${expiry}; Secure; sameSite=Lax; domain=${hostname}; path=/`
}

const getCookieLite = (name) => {
    let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    if (match) return match[2]
}

const setDarkMode = (dark) => {
    if (dark) {
        setCookieLite("dark-mode", "true")
        document.documentElement.setAttribute("data-theme", "dark")
    } else {
        setCookieLite("dark-mode", "false")
        document.documentElement.setAttribute("data-theme", "light")
    }
}

// watch for themeing changes
darkModePreference.addEventListener("change", (event) => {
    setDarkMode(event.matches)
})



