function setThinkTime(context, events, done) {
  const min = Number(context.vars.thinkMinSec ?? 8)
  const max = Number(context.vars.thinkMaxSec ?? 25)
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  context.vars.thinkTime = Math.floor(lo + Math.random() * (hi - lo + 1))
  return done()
}

module.exports = { setThinkTime }
