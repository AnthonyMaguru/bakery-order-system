class Order {
  Order({
    required this.id,
    required this.type,
    required this.status,
    required this.dueDate,
    required this.paymentStatus,
    this.occasion,
  });

  final String id;
  final String type;
  final String status;
  final DateTime dueDate;
  final String paymentStatus;
  final String? occasion;

  factory Order.fromJson(Map<String, dynamic> json) => Order(
        id: json['id'] as String,
        type: json['type'] as String,
        status: json['status'] as String,
        dueDate: DateTime.parse(json['dueDate'] as String),
        paymentStatus: json['paymentStatus'] as String,
        occasion: json['occasion'] as String?,
      );
}

/// "DEPOSIT_PAID" -> "Deposit paid"
String humanize(String value) =>
    value[0] + value.substring(1).toLowerCase().replaceAll('_', ' ');
