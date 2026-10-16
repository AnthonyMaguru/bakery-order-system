import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/cache.dart';
import '../../core/format.dart';
import '../../core/theme.dart';
import '../../core/widgets.dart';
import '../../models/bakery.dart';
import 'bakery_screen.dart';

/// The first tab. With one bakery (the pilot) it opens that bakery straight away;
/// with more, customers pick their area and then a bakery that delivers there.
class BakeriesScreen extends StatefulWidget {
  const BakeriesScreen({super.key});

  @override
  State<BakeriesScreen> createState() => _BakeriesScreenState();
}

class _BakeriesScreenState extends State<BakeriesScreen> {
  static const _areaKey = 'area';
  late Future<(Cached<dynamic>, String?)> _data = _load();

  Future<(Cached<dynamic>, String?)> _load() async {
    final prefs = await SharedPreferences.getInstance();
    return (await cachedGet('/bakeries'), prefs.getString(_areaKey));
  }

  Future<void> _chooseArea(List<Bakery> bakeries, String? current) async {
    final areas = {for (final b in bakeries) ...b.deliveryAreas}.toList()..sort();
    final area = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          children: [
            Text('Where should the cake go?', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            const Text('Sending a cake to someone in another area? Pick their area.', style: TextStyle(color: AppColors.muted)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [for (final a in areas) ChoiceChip(label: Text(a), selected: a == current, onSelected: (_) => Navigator.of(context).pop(a))],
            ),
          ],
        ),
      ),
    );
    if (area == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_areaKey, area);
    setState(() => _data = _load());
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _data,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(body: ErrorView(message: snapshot.error.toString(), onRetry: () => setState(() => _data = _load())));
        }
        if (!snapshot.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator()));
        final (cached, area) = snapshot.data!;
        final all = (cached.data as List).map((b) => Bakery.fromJson(b as Map<String, dynamic>)).toList();

        // The pilot: skip the list and open the only bakery.
        if (all.length == 1) return BakeryScreen(bakery: all.first, savedAt: cached.savedAt);

        final shown = area == null ? all : all.where((b) => b.deliversTo(area)).toList();
        return Scaffold(
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: () async => setState(() => _data = _load()),
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  if (cached.isOffline) OfflineBanner(savedAt: cached.savedAt!),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Delivering to', style: TextStyle(fontSize: 13, color: AppColors.muted)),
                              Text(area ?? 'Choose your area', style: Theme.of(context).textTheme.titleMedium),
                            ],
                          ),
                        ),
                        OutlinedButton(
                          style: OutlinedButton.styleFrom(minimumSize: const Size(44, 44), side: const BorderSide(color: AppColors.lineStrong, width: 1.5)),
                          onPressed: () => _chooseArea(all, area),
                          child: Text(area == null ? 'Choose' : 'Change'),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
                    child: Text('Choose a bakery', style: Theme.of(context).textTheme.headlineMedium),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                    child: Text(
                      area == null ? '${all.length} bakeries' : '${shown.length} ${shown.length == 1 ? 'bakery delivers' : 'bakeries deliver'} to $area',
                      style: const TextStyle(color: AppColors.muted),
                    ),
                  ),
                  for (final b in shown) _BakeryRow(bakery: b, savedAt: cached.savedAt),
                  if (shown.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('No bakery delivers there yet. Try a nearby area, or choose pickup at a bakery.'),
                    ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _BakeryRow extends StatelessWidget {
  const _BakeryRow({required this.bakery, this.savedAt});

  final Bakery bakery;
  final DateTime? savedAt;

  @override
  Widget build(BuildContext context) {
    final next = bakery.nextCustomDate;
    return InkWell(
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => BakeryScreen(bakery: bakery, savedAt: savedAt))),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.line))),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: 84,
                height: 84,
                color: AppColors.sand,
                child: bakery.imageUrl == null ? const Icon(Icons.storefront_outlined, color: AppColors.muted) : Image.network(bakery.imageUrl!, fit: BoxFit.cover),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(bakery.name, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(bakery.about ?? bakery.city, style: const TextStyle(fontSize: 14, color: AppColors.muted)),
                  if (bakery.cakesFrom != null) Text('Cakes from ${money(bakery.cakesFrom!, bakery.currency)}', style: const TextStyle(fontSize: 14, color: AppColors.ink2)),
                  const SizedBox(height: 2),
                  Text(
                    next == null ? 'Fully booked for now' : 'Next custom cake: ${dayLabel(fromDayKey(next))}',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: next == null ? AppColors.warn : AppColors.ok),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
