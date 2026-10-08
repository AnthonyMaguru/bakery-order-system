class Product {
  Product({
    required this.id,
    required this.name,
    required this.category,
    this.description,
    this.basePriceUgx,
    this.imageUrl,
  });

  final String id;
  final String name;
  final String category;
  final String? description;
  final int? basePriceUgx;
  final String? imageUrl;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        category: json['category'] as String,
        description: json['description'] as String?,
        basePriceUgx: json['basePriceUgx'] as int?,
        imageUrl: json['imageUrl'] as String?,
      );
}
