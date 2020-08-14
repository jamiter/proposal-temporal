import { GetIntrinsic } from './intrinsicclass.mjs';
import { ES } from './ecmascript.mjs';
import { TimeZone } from './timezone.mjs';

const DATE = Symbol('date');
const YM = Symbol('ym');
const MD = Symbol('md');
const TIME = Symbol('time');
const DATETIME = Symbol('datetime');
const ORIGINAL = Symbol('original');
const TIMEZONE = Symbol('timezone');

const descriptor = (value) => {
  return {
    value,
    enumerable: true,
    writable: false,
    configurable: true
  };
};

const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
const ObjectAssign = Object.assign;

export function DateTimeFormat(locale = IntlDateTimeFormat().resolvedOptions().locale, options = {}) {
  if (!(this instanceof DateTimeFormat)) return new DateTimeFormat(locale, options);

  this[ORIGINAL] = new IntlDateTimeFormat(locale, options);
  this[TIMEZONE] = new TimeZone(this.resolvedOptions().timeZone);
  this[DATE] = new IntlDateTimeFormat(locale, dateAmend(options));
  this[YM] = new IntlDateTimeFormat(locale, yearMonthAmend(options));
  this[MD] = new IntlDateTimeFormat(locale, monthDayAmend(options));
  this[TIME] = new IntlDateTimeFormat(locale, timeAmend(options));
  this[DATETIME] = new IntlDateTimeFormat(locale, datetimeAmend(options));
}

DateTimeFormat.supportedLocalesOf = function (...args) {
  return IntlDateTimeFormat.supportedLocalesOf(...args);
};

const properties = {
  resolvedOptions: descriptor(resolvedOptions),
  format: descriptor(format),
  formatRange: descriptor(formatRange)
};

if ('formatToParts' in IntlDateTimeFormat.prototype) {
  properties.formatToParts = descriptor(formatToParts);
}

if ('formatRangeToParts' in IntlDateTimeFormat.prototype) {
  properties.formatRangeToParts = descriptor(formatRangeToParts);
}

DateTimeFormat.prototype = Object.create(IntlDateTimeFormat.prototype, properties);

function resolvedOptions() {
  return this[ORIGINAL].resolvedOptions();
}

function adjustFormatterCalendar(formatter, calendar) {
  const options = formatter.resolvedOptions();
  if (!calendar || calendar.id === options.calendar || calendar.id === 'gregory' || calendar.id === 'iso8601') {
    return formatter;
  }
  const locale = `${options.locale}-u-ca-${calendar.id}`;
  return new IntlDateTimeFormat(locale, options);
}

function format(datetime, ...rest) {
  const { absolute, formatter, calendar } = extractOverrides(datetime, this);
  if (absolute && formatter) {
    return adjustFormatterCalendar(formatter, calendar).format(absolute.getEpochMilliseconds());
  }
  return this[ORIGINAL].format(datetime, ...rest);
}

function formatToParts(datetime, ...rest) {
  const { absolute, formatter, calendar } = extractOverrides(datetime, this);
  if (absolute && formatter) {
    return adjustFormatterCalendar(formatter, calendar).formatToParts(absolute.getEpochMilliseconds());
  }
  return this[ORIGINAL].formatToParts(datetime, ...rest);
}

function formatRange(a, b) {
  if ('object' === typeof a && 'object' === typeof b && a && b) {
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      throw new TypeError('Intl.DateTimeFormat accepts two values of the same type');
    }
    const Calendar = GetIntrinsic('%Temporal.Calendar%');
    const isoCalendar = Calendar.from('iso8601');
    const { absolute: aa, formatter: aformatter, calendar: acalendar = isoCalendar } = extractOverrides(a, this);
    const { absolute: bb, formatter: bformatter, calendar: bcalendar = isoCalendar } = extractOverrides(b, this);
    const calendar = ES.ChooseCommonCalendar(acalendar, bcalendar);
    if (!calendar) {
      throw new RangeError(`cannot format range between two dates of ${acalendar} and ${bcalendar} calendars`);
    }
    if (aa && bb && aformatter && bformatter && aformatter === bformatter) {
      const formatter = adjustFormatterCalendar(aformatter, calendar);
      return formatter.formatRange(aa.getEpochMilliseconds(), bb.getEpochMilliseconds());
    }
  }
  return this[ORIGINAL].formatRange(a, b);
}

function formatRangeToParts(a, b) {
  if ('object' === typeof a && 'object' === typeof b && a && b) {
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
      throw new TypeError('Intl.DateTimeFormat accepts two values of the same type');
    }
    const Calendar = GetIntrinsic('%Temporal.Calendar%');
    const isoCalendar = Calendar.from('iso8601');
    const { absolute: aa, formatter: aformatter, calendar: acalendar = isoCalendar } = extractOverrides(a, this);
    const { absolute: bb, formatter: bformatter, calendar: bcalendar = isoCalendar } = extractOverrides(b, this);
    const calendar = ES.ChooseCommonCalendar(acalendar, bcalendar);
    if (!calendar) {
      throw new RangeError(`cannot format range between two dates of ${acalendar} and ${bcalendar} calendars`);
    }
    if (aa && bb && aformatter && bformatter && aformatter === bformatter) {
      const formatter = adjustFormatterCalendar(aformatter, calendar);
      return formatter.formatRangeToParts(aa.getEpochMilliseconds(), bb.getEpochMilliseconds());
    }
  }
  return this[ORIGINAL].formatRangeToParts(a, b);
}

function amend(options = {}, amended = {}) {
  options = ObjectAssign({}, options);
  for (let opt of ['year', 'month', 'day', 'hour', 'minute', 'second', 'weekday', 'timeZoneName']) {
    options[opt] = opt in amended ? amended[opt] : options[opt];
    if (options[opt] === false || options[opt] === undefined) delete options[opt];
  }
  return options;
}

function timeAmend(options) {
  options = amend(options, { year: false, month: false, day: false, weekday: false, timeZoneName: false });
  if (!hasTimeOptions(options)) {
    options = ObjectAssign(options, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function yearMonthAmend(options) {
  options = amend(options, {
    day: false,
    hour: false,
    minute: false,
    second: false,
    weekday: false,
    timeZoneName: false
  });
  if (!('year' in options || 'month' in options)) {
    options = ObjectAssign(options, { year: 'numeric', month: 'numeric' });
  }
  return options;
}

function monthDayAmend(options) {
  options = amend(options, {
    year: false,
    hour: false,
    minute: false,
    second: false,
    weekday: false,
    timeZoneName: false
  });
  if (!('month' in options || 'day' in options)) {
    options = ObjectAssign(options, { month: 'numeric', day: 'numeric' });
  }
  return options;
}

function dateAmend(options) {
  options = amend(options, { hour: false, minute: false, second: false, timeZoneName: false });
  if (!hasDateOptions(options)) {
    options = ObjectAssign(options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }
  return options;
}

function datetimeAmend(options) {
  options = amend(options, { timeZoneName: false });
  if (!hasTimeOptions(options) && !hasDateOptions(options)) {
    ObjectAssign(options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function hasDateOptions(options) {
  return 'year' in options || 'month' in options || 'day' in options || 'weekday' in options;
}

function hasTimeOptions(options) {
  return 'hour' in options || 'minute' in options || 'second' in options;
}

function extractOverrides(datetime, main) {
  let formatter, calendar;
  const Absolute = GetIntrinsic('%Temporal.Absolute%');
  const Date = GetIntrinsic('%Temporal.Date%');
  const DateTime = GetIntrinsic('%Temporal.DateTime%');
  const MonthDay = GetIntrinsic('%Temporal.MonthDay%');
  const Time = GetIntrinsic('%Temporal.Time%');
  const YearMonth = GetIntrinsic('%Temporal.YearMonth%');

  if (datetime instanceof Time) {
    datetime = datetime.toDateTime(new Date(1970, 1, 1));
    formatter = main[TIME];
  }
  if (datetime instanceof YearMonth) {
    calendar = datetime.calendar;
    const { year, month, day } = datetime.getISOCalendarFields();
    datetime = new Date(year, month, day, datetime.calendar);
    formatter = main[YM];
  }
  if (datetime instanceof MonthDay) {
    calendar = datetime.calendar;
    const { year, month, day } = datetime.getISOCalendarFields();
    datetime = new Date(year, month, day, datetime.calendar);
    formatter = main[MD];
  }
  if (datetime instanceof Date) {
    calendar = calendar || datetime.calendar;
    datetime = datetime.toDateTime(new Time(12, 0));
    formatter = formatter || main[DATE];
  }
  if (datetime instanceof DateTime) {
    calendar = calendar || datetime.calendar;
    formatter = formatter || main[DATETIME];
    datetime = main[TIMEZONE].getAbsoluteFor(datetime);
  }
  if (datetime instanceof Absolute) {
    formatter = formatter || main[DATETIME];
    return { absolute: datetime, formatter, calendar };
  } else {
    return {};
  }
}
