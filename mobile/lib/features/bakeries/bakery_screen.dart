import 'package:flutter/material.dart';

import '../../core/cache.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../models/bakery.dart';
import '../../models/product.dart';
import '../custom_order/occasion_step.dart';
import '../product/product_screen.dart';

/// A bakery's page: design your own cake, or pick from its products.
class BakeryScreen extends StatefulWidget {
  const BakeryScreen({super.key, required this.bakery, this.savedAt});

  final Bakery bakery;
  final DateTime? savedAt;

  @override
  State<BakeryScreen> createState() => _BakeryScreenState();
}

class _BakeryScreenState extends State<BakeryScreen> {
  late Future<Cached<dynamic>> _products = cachedGet(
    '/bakeries/${widget.bakery.id}/products',
  );
  String? _category;

  void _reloadProducts() {
    if (!mounted) return;
    setState(() {
      _products = cachedGet('/bakeries/${widget.bakery.id}/products');
    });
  }

  @override
  Widget build(BuildContext context) {
    final bakery = widget.bakery;
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      appBar: canPop ? AppBar(title: Text(bakery.name)) : null,
      body: SafeArea(
        child: FutureBuilder(
          future: _products,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return ErrorView(
                message: snapshot.error.toString(),
                onRetry: _reloadProducts,
              );
            }
            final cached = snapshot.data;
            final products = cached == null
                ? <Product>[]
                : (cached.data as List)
                      .map((p) => Product.fromJson(p as Map<String, dynamic>))
                      .toList();
            final categories = [
              for (final c in categoryLabels.keys)
                if (products.any((p) => p.category == c)) c,
            ];
            final category =
                _category ?? (categories.isEmpty ? null : categories.first);
            final shown = products
                .where((p) => p.category == category)
                .toList();
            final savedAt = cached?.savedAt ?? widget.savedAt;

            return RefreshIndicator(
              onRefresh: () async {
                _reloadProducts();
                await _products;
              },
              child: CustomScrollView(
                slivers: [
                  if (savedAt != null)
                    SliverToBoxAdapter(child: OfflineBanner(savedAt: savedAt)),
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(20, canPop ? 0 : 20, 20, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _BakeryHero(bakery: bakery),
                          const SizedBox(height: 20),
                          Text(
                            'Make it yours',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'A cake designed around your people, your moment, and your taste.',
                            style: TextStyle(color: AppColors.muted),
                          ),
                          const SizedBox(height: 12),
                          _DesignBanner(
                            onTap: () => Navigator.of(
                              context,
                            ).push(OccasionStep.route(bakery)),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'From the counter',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Ready-made favourites for when the celebration cannot wait.',
                            style: TextStyle(color: AppColors.muted),
                          ),
                          const SizedBox(height: 12),
                        ],
                      ),
                    ),
                  ),
                  if (snapshot.connectionState == ConnectionState.waiting &&
                      cached == null)
                    const SliverFillRemaining(
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    SliverToBoxAdapter(
                      child: SizedBox(
                        height: 52,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          children: [
                            for (final c in categories)
                              Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(categoryLabels[c]!),
                                  selected: c == category,
                                  onSelected: (_) =>
                                      setState(() => _category = c),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                      sliver: SliverGrid.count(
                        crossAxisCount: 2,
                        mainAxisSpacing: 20,
                        crossAxisSpacing: 14,
                        childAspectRatio: 0.78,
                        children: [
                          for (final p in shown)
                            _ProductTile(product: p, bakery: bakery),
                        ],
                      ),
                    ),
                    if (products.isEmpty)
                      const SliverToBoxAdapter(
                        child: Padding(
                          padding: EdgeInsets.all(20),
                          child: Text(
                            'No products listed yet. You can still design your own cake.',
                          ),
                        ),
                      ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DesignBanner extends StatelessWidget {
  const _DesignBanner({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.accent,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: const Padding(
          padding: EdgeInsets.all(20),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Design your own cake',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Pick the shape, colours and decorations. The bakery sends you a price.',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(width: 12),
              Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 26),
            ],
          ),
        ),
      ),
    );
  }
}

class _BakeryHero extends StatelessWidget {
  const _BakeryHero({required this.bakery});

  final Bakery bakery;

  @override
  Widget build(BuildContext context) {
    final details = [
      bakery.city,
      if (bakery.deliveryAreas.isNotEmpty)
        'Delivers to ${bakery.deliveryAreas.take(2).join(', ')}',
      if (bakery.cakesFrom != null)
        'From ${money(bakery.cakesFrom!, bakery.currency)}',
    ].join(' · ');
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: Stack(
        children: [
          Container(
            height: 188,
            width: double.infinity,
            color: AppColors.ink,
            child: bakery.imageUrl == null
                ? const Center(
                    child: Icon(
                      Icons.storefront_outlined,
                      color: AppColors.sand,
                      size: 64,
                    ),
                  )
                  : Image.network(
                      bakery.imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Center(
                        child: Icon(Icons.storefront_outlined, color: AppColors.sand, size: 64),
                      ),
                    ),
          ),
          Positioned(
            left: 18,
            right: 18,
            bottom: 16,
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              decoration: BoxDecoration(
                color: AppColors.ink.withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    bakery.name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    bakery.about ?? 'Thoughtful cakes for meaningful occasions',
                    style: const TextStyle(color: Colors.white, fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    details,
                    style: const TextStyle(color: AppColors.sand, fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductTile extends StatelessWidget {
  const _ProductTile({required this.product, required this.bakery});

  final Product product;
  final Bakery bakery;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ProductScreen(product: product, bakery: bakery),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: double.infinity,
                color: AppColors.sand,
                child: product.imageUrl == null
                    ? const Icon(
                        Icons.cake_outlined,
                        color: AppColors.muted,
                        size: 32,
                      )
                    : Image.network(product.imageUrl!, fit: BoxFit.cover),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            product.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
          Text(
            money(product.price, bakery.currency),
            style: const TextStyle(fontSize: 14, color: AppColors.ink2),
          ),
        ],
      ),
    );
  }
}
