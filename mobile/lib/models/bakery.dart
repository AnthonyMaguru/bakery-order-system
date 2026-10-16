/// A bakery as customers see it (GET /bakeries).
class Bakery {
  Bakery({
    required this.id,
    required this.slug,
    required this.name,
    required this.city,
    required this.currency,
    required this.deliveryAreas,
    required this.deliveryFee,
    required this.pickupAvailable,
    required this.acceptsCash,
    required this.acceptsMobileMoney,
    this.about,
    this.phone,
    this.address,
    this.imageUrl,
    this.mobileMoneyNumber,
    this.cakesFrom,
    this.nextCustomDate,
  });

  final String id;
  final String slug;
  final String name;
  final String city;
  final String currency;
  final List<String> deliveryAreas;
  final int deliveryFee;
  final bool pickupAvailable;
  final bool acceptsCash;
  final bool acceptsMobileMoney;
  final String? about;
  final String? phone;
  final String? address;
  final String? imageUrl;
  final String? mobileMoneyNumber;
  final int? cakesFrom;

  /// "2026-10-20": the first day a new custom cake could be due.
  final String? nextCustomDate;

  bool deliversTo(String area) => deliveryAreas.any((a) => a.toLowerCase() == area.toLowerCase());

  factory Bakery.fromJson(Map<String, dynamic> json) => Bakery(
        id: json['id'] as String,
        slug: json['slug'] as String,
        name: json['name'] as String,
        city: json['city'] as String,
        currency: json['currency'] as String,
        deliveryAreas: (json['deliveryAreas'] as List).cast<String>(),
        deliveryFee: json['deliveryFee'] as int,
        pickupAvailable: json['pickupAvailable'] as bool,
        acceptsCash: json['acceptsCash'] as bool,
        acceptsMobileMoney: json['acceptsMobileMoney'] as bool,
        about: json['about'] as String?,
        phone: json['phone'] as String?,
        address: json['address'] as String?,
        imageUrl: json['imageUrl'] as String?,
        mobileMoneyNumber: json['mobileMoneyNumber'] as String?,
        cakesFrom: json['cakesFrom'] as int?,
        nextCustomDate: json['nextCustomDate'] as String?,
      );
}

/// One day in GET /bakeries/:id/availability.
class CalendarDay {
  CalendarDay({required this.date, required this.status, required this.booked, required this.limit});

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
