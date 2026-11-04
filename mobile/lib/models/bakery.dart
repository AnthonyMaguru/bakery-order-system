/// A bakery as customers see it (GET /bakeries).
class Bakery {
  Bakery({
    required this.id,
    required this.slug,
    required this.name,
    required this.city,
    required this.region,
    required this.municipality,
    required this.currency,
    required this.deliveryZones,
    required this.pickupAvailable,
    required this.acceptsCash,
    required this.acceptsMobileMoney,
    this.about,
    this.phone,
    this.address,
    this.imageUrl,
    this.mobileMoneyNumber,
    this.cakesFrom,
    this.averageRating,
    this.reviewCount = 0,
    this.nextCustomDate,
    this.handoverTimes = const [],
    this.occasions = const [
      'Birthday',
      'Wedding',
      'Introduction',
      'Graduation',
      'Baby shower',
      'Other',
    ],
    this.customNoticeDays = 3,
  });

  final String id;
  final String slug;
  final String name;
  final String city;
  final String region;
  final String municipality;
  final String currency;
  final List<DeliveryZone> deliveryZones;
  final bool pickupAvailable;
  final bool acceptsCash;
  final bool acceptsMobileMoney;
  final String? about;
  final String? phone;
  final String? address;
  final String? imageUrl;
  final String? mobileMoneyNumber;
  final int? cakesFrom;
  final double? averageRating;
  final int reviewCount;

  /// "2026-10-20": the first day a new custom cake could be due.
  final String? nextCustomDate;

  /// Bakery-configured local times defining the handover window.
  final List<String> handoverTimes;

  /// Celebration occasions offered by this bakery for custom designs.
  final List<String> occasions;

  /// Number of days notice required for custom bespoke cakes.
  final int customNoticeDays;

  bool deliversTo(String area) => deliveryZones.any(
    (zone) =>
        [zone.name, zone.division, zone.municipality, zone.region, zone.label]
            .whereType<String>()
            .any((value) => value.toLowerCase() == area.toLowerCase()),
  );

  /// Parses and sorts valid "HH:MM" handover-window boundaries.
  List<(int, int)> get parsedHandoverTimes {
    final result = <(int, int)>[];
    for (final t in handoverTimes) {
      final parts = t.split(':');
      if (parts.length == 2) {
        final h = int.tryParse(parts[0]);
        final m = int.tryParse(parts[1]);
        if (h != null && m != null && h >= 0 && h <= 23 && m >= 0 && m <= 59) {
          result.add((h, m));
        }
      }
    }
    result.sort((a, b) => (a.$1 * 60 + a.$2).compareTo(b.$1 * 60 + b.$2));
    return result.toSet().toList();
  }

  factory Bakery.fromJson(Map<String, dynamic> json) => Bakery(
    id: json['id'] as String,
    slug: json['slug'] as String,
    name: json['name'] as String,
    city: json['city'] as String,
    region: json['region'] as String? ?? '',
    municipality: json['municipality'] as String? ?? json['city'] as String,
    currency: json['currency'] as String,
    deliveryZones: ((json['deliveryZones'] as List?) ?? const [])
        .cast<Map<String, dynamic>>()
        .map(DeliveryZone.fromJson)
        .toList(),
    pickupAvailable: json['pickupAvailable'] as bool,
    acceptsCash: json['acceptsCash'] as bool,
    acceptsMobileMoney: json['acceptsMobileMoney'] as bool,
    about: json['about'] as String?,
    phone: json['phone'] as String?,
    address: json['address'] as String?,
    imageUrl: json['imageUrl'] as String?,
    mobileMoneyNumber: json['mobileMoneyNumber'] as String?,
    cakesFrom: json['cakesFrom'] as int?,
    averageRating: (json['averageRating'] as num?)?.toDouble(),
    reviewCount: json['reviewCount'] as int? ?? 0,
    nextCustomDate: json['nextCustomDate'] as String?,
    handoverTimes:
        (json['handoverTimes'] as List?)?.cast<String>() ??
        const [],
    occasions:
        (json['occasions'] as List?)?.cast<String>() ??
        const [
          'Birthday',
          'Wedding',
          'Introduction',
          'Graduation',
          'Baby shower',
          'Other',
        ],
    customNoticeDays: json['customNoticeDays'] as int? ?? 3,
  );
}

class DeliveryZone {
  const DeliveryZone({
    required this.id,
    required this.region,
    required this.municipality,
    required this.name,
    this.division,
  });

  final String id;
  final String region;
  final String municipality;
  final String? division;
  final String name;

  String get label => [
    name,
    division,
    municipality,
    region,
  ].whereType<String>().where((s) => s.isNotEmpty).join(' · ');

  factory DeliveryZone.fromJson(Map<String, dynamic> json) => DeliveryZone(
    id: json['id'] as String,
    region: json['region'] as String,
    municipality: json['municipality'] as String,
    division: json['division'] as String?,
    name: json['name'] as String,
  );
}

/// One day in GET /bakeries/:id/availability.
class CalendarDay {
  CalendarDay({
    required this.date,
    required this.status,
    required this.booked,
    required this.limit,
  });

  /// "2026-11-07"
  final String date;

  /// OPEN, FULL, CLOSED, BLOCKED or TOO_SOON
  final String status;
  final int booked;
  final int limit;

  factory CalendarDay.fromJson(Map<String, dynamic> json) => CalendarDay(
    date: json['date'] as String,
    status: json['status'] as String,
    booked: json['booked'] as int,
    limit: json['limit'] as int,
  );
}
