const config = require("../config")
const flows = require("./flows")

function setDummyToken(context, events, done) {
  context.vars.turnstileToken = config.turnstileDummyToken
  return done()
}

// flows.rhJourney reads vuContext.vars.email/.password/.slug, but 06-peak-mixed.yml
// loads RH creds via the rh-credentials.csv payload under rhEmail/rhPassword/slug
// (kept distinct from the employee-credentials.csv email/password fields so the two
// payloads, which are both loaded into every VU's vars regardless of scenario, don't
// clobber each other). This wrapper remaps the names before delegating to rhJourney.
async function rhBrowserJourney(page, vuContext, events, test) {
  vuContext.vars.email = vuContext.vars.rhEmail
  vuContext.vars.password = vuContext.vars.rhPassword
  return flows.rhJourney(page, vuContext, events, test)
}

module.exports = { setDummyToken, employeeJourney: flows.employeeJourney, rhBrowserJourney }
