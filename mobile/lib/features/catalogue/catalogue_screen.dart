import 'package:flutter/material.dart';

import '../../core/api_client.dart';
import '../orders/order_form_screen.dart';
import 'product.dart';

class CatalogueScreen extends StatefulWidget {
  const CatalogueScreen({super.key});

  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  // TODO(mobile lead): cache the catalogue locally so browsing works offline (concept paper 3.3).
  late Future<List<Product>> _products = _load();

  Future<List<Product>> _load() async {
    final data = await api.get('/products') as List<dynamic>;
    return data.map((p) => Product.fromJson(p as Map<String, dynamic>)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cakes')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.of(context).push(
          MaterialPageRoute<void>(builder: (_) => const OrderFormScreen()),
        ),
        icon: const Icon(Icons.add),
        label: const Text('Custom order'),
      ),
      body: FutureBuilder(
        future: _products,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: TextButton(
                onPressed: () => setState(() => _products = _load()),
                child: Text('Could not load cakes. Tap to retry.\n${snapshot.error}'),
              ),
            );
          }
          final products = snapshot.data!;
          if (products.isEmpty) return const Center(child: Text('No cakes listed yet.'));
          return ListView.separated(
            itemCount: products.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final p = products[i];
              return ListTile(
                title: Text(p.name),
                subtitle: p.description == null ? null : Text(p.description!),
                trailing: p.basePriceUgx == null ? null : Text('UGX ${p.basePriceUgx}'),
              );
            },
          );
        },
      ),
    );
  }
}
