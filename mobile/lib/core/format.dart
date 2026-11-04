// Formatting shared by every screen. Dates are shown in the phone's timezone,
// which for the pilot is the bakery's (Africa/Kampala).

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/// "UGX 165,000". Amounts are whole units of the bakery's currency.
String money(int amount, String currency) {
  final digits = amount.abs().toString();
  final grouped = digits.replaceAllMapped(
    RegExp(r'\B(?=(\d{3})+(?!\d))'),
    (_) => ',',
  );
  return '$currency ${amount < 0 ? '-' : ''}$grouped';
}

/// "Sat 7 Nov"
String dayLabel(DateTime date) {
  final d = date.toLocal();
  return '${_weekdays[d.weekday - 1]} ${d.day} ${_months[d.month - 1]}';
}

/// "2:00 pm"
String timeLabel(DateTime date) {
  final d = date.toLocal();
  final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$hour:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'am' : 'pm'}';
}

/// "9:00 am – 5:00 pm" for the bakery's configured handover window.
String? timeWindowLabel(List<(int, int)> times) {
  if (times.isEmpty) return null;
  final sorted = times.toList()
    ..sort((a, b) => (a.$1 * 60 + a.$2).compareTo(b.$1 * 60 + b.$2));
  String label((int, int) time) =>
      timeLabel(DateTime(2000, 1, 1, time.$1, time.$2));
  if (sorted.length == 1) return label(sorted.single);
  return '${label(sorted.first)} – ${label(sorted.last)}';
}

/// "Sat 7 Nov, 2:00 pm"
String dateTimeLabel(DateTime date) => '${dayLabel(date)}, ${timeLabel(date)}';

/// "2026-11-07", the format the API uses for calendar days.
String dayKey(DateTime date) {
  final d = date.toLocal();
  return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
}

/// The local date for a "2026-11-07" key.
DateTime fromDayKey(String key) {
  final parts = key.split('-').map(int.parse).toList();
  return DateTime(parts[0], parts[1], parts[2]);
}

/// "BK1043"
String orderRef(int number) => 'BK$number';
