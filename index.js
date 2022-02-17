require('dotenv').config()
const axios = require('axios')

const cookie = process.env.COOKIE;
const webhook = process.env.WEBHOOK;

const findUntilEnd = ({data, searchString}) => {
    let finalString = '';
    for (let startIndex = data.indexOf(searchString) + searchString.length; startIndex < data.length; startIndex++) {
        if (data[startIndex] !== "<") {
            finalString += data[startIndex]
        }
        else {
            startIndex = data.length + 1;
        }
    }
    return finalString
}

axios.get('https://psn.wizemen.net/launchpadnew', {
    headers: {
        'Cookie': cookie
    }
})
    .then(async (resp) => {
        const page = resp.data

        const quote = findUntilEnd({
            data: page,
            searchString: "<sup><i style=\"color: #ff9900; font-size: 16px;\" class=\"fas fa-quote-left\"></i></sup>&nbsp;<span style=\"font-weight: 600; font-size: 16px;\">"
        })

        const person = findUntilEnd({
            data: page,
            searchString: "<span style=\"font-weight: 600; color: #A0A0A0\">"
        })

        await axios.post(webhook, {
            content: `> ${quote}\n${person}`
        })
    })
    .catch(err => {
        console.error(err)
    })
