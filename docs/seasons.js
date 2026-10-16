/* installkite seasons: sets data-season on <html> during special dates, in
   the visitor's local time. ?season=<id> forces one, ?season=off none.
   Shared by the site and the checker app (docs/app). No dependencies. */
(function (w) {
  var NAMES = { newyear: 'New Year', carnival: 'Carnival', easter: 'Easter', valentine: "Valentine's", junina: 'Festa Junina', halloween: 'Halloween', christmas: 'Christmas' };
  var DAY = 864e5;

  /** Easter Sunday, by the anonymous Gregorian algorithm. */
  function easter(y) {
    var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    var f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    var n = h + l - 7 * m + 114;
    return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
  }
  function br(lang) {
    return /^pt-br\b/i.test(lang || '');
  }

  /** The season id for a date and a language, or ''. */
  function detect(date, lang) {
    var y = date.getFullYear(), md = (date.getMonth() + 1) * 100 + date.getDate();
    var diff = Math.round((new Date(y, date.getMonth(), date.getDate()) - easter(y)) / DAY);
    var carnival = diff >= -50 && diff <= -46;
    if (md >= 1230 || md <= 102) return 'newyear';
    if (md >= 1218 && md <= 1226) return 'christmas';
    if (md >= 1024 && md <= 1031) return 'halloween';
    if (carnival && br(lang)) return 'carnival';
    if (md === 214 || (md === 612 && br(lang))) return 'valentine';
    if (carnival) return 'carnival';
    if (diff >= -2 && diff <= 0) return 'easter';
    if (md >= 613 && md <= 629) return 'junina';
    return '';
  }

  function label(id, lang) {
    if (!NAMES[id]) return '';
    return (id === 'junina' && !br(lang) ? 'Midsummer' : NAMES[id]) + ' mode';
  }

  var lang = (w.navigator && w.navigator.language) || '';
  var q = /[?&]season=([a-z]+)/.exec((w.location && w.location.search) || '');
  var forced = !!(q && (q[1] === 'off' || NAMES[q[1]]));
  var id = forced ? (q[1] === 'off' ? '' : q[1]) : detect(new Date(), lang);
  var key = 'ik:season:' + id;
  var active = id;
  if (id && !forced) {
    try {
      if (w.localStorage.getItem(key) === 'off') active = '';
    } catch {
      /* storage blocked */
    }
  }

  var api = {
    id: id,
    active: active,
    forced: forced,
    lang: lang,
    names: NAMES,
    easter: easter,
    detect: detect,
    label: function (s) {
      return label(s || id, lang);
    },
    set: function (on) {
      if (!id) return;
      api.active = on ? id : '';
      try {
        if (on) w.localStorage.removeItem(key);
        else w.localStorage.setItem(key, 'off');
      } catch {
        /* storage blocked */
      }
      apply();
      if (typeof w.CustomEvent === 'function') w.dispatchEvent(new w.CustomEvent('ik:season', { detail: api.active }));
    },
  };
  function apply() {
    var html = w.document.documentElement;
    if (api.active) html.setAttribute('data-season', api.active);
    else html.removeAttribute('data-season');
  }
  apply();
  w.ikSeasons = api;
})(window);
